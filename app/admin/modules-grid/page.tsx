"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutGrid, Plus, Trash2, Save, RefreshCw, Database,
  Pencil, X, Check, ChevronUp, ChevronDown, RotateCcw,
  GraduationCap, Users, CreditCard, Brain, Fingerprint,
  Laptop, MessageSquare, Layers, BookOpen, Award,
  Shield, Bell, Star, Calendar, TrendingUp, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useConfirm } from "@/components/providers/confirm-provider";

// ── Icon registry ─────────────────────────────────────────────────────────────
const ICON_MAP: Record<string, React.ReactNode> = {
  GraduationCap: <GraduationCap className="h-5 w-5" />,
  Users: <Users className="h-5 w-5" />,
  CreditCard: <CreditCard className="h-5 w-5" />,
  Brain: <Brain className="h-5 w-5" />,
  Fingerprint: <Fingerprint className="h-5 w-5" />,
  Laptop: <Laptop className="h-5 w-5" />,
  MessageSquare: <MessageSquare className="h-5 w-5" />,
  Layers: <Layers className="h-5 w-5" />,
  BookOpen: <BookOpen className="h-5 w-5" />,
  Award: <Award className="h-5 w-5" />,
  Shield: <Shield className="h-5 w-5" />,
  Bell: <Bell className="h-5 w-5" />,
  Star: <Star className="h-5 w-5" />,
  Calendar: <Calendar className="h-5 w-5" />,
  TrendingUp: <TrendingUp className="h-5 w-5" />,
};
const ICON_NAMES = Object.keys(ICON_MAP);

// ── Color presets ─────────────────────────────────────────────────────────────
const COLOR_PRESETS = [
  { label: "Ocean Blue",   hoverFrom: "#1D496C", hoverTo: "#429CE4", accent: "#429CE4" },
  { label: "Forest Green", hoverFrom: "#6A7626", hoverTo: "#4F581D", accent: "#6A7626" },
  { label: "Amber Gold",   hoverFrom: "#FFA600", hoverTo: "#ED6708", accent: "#FFA600" },
  { label: "Royal Purple", hoverFrom: "#5D3FD3", hoverTo: "#7C3AED", accent: "#8B5CF6" },
  { label: "Sky Blue",     hoverFrom: "#285E89", hoverTo: "#429CE4", accent: "#429CE4" },
  { label: "Sunset",       hoverFrom: "#1D496C", hoverTo: "#FFA600", accent: "#FFA600" },
];

const DEFAULT_CARDS = [
  { title: "Student Dashboard",        emoji: "👨‍🎓", iconName: "GraduationCap", desc: "Designed to keep students organized, motivated, academic-centric, and highly engaged.",         points: ["Attendance percentage","Academic performance analytics","Timetable & upcoming exams","Homework and assignment tracker"],       hoverFrom: "#1D496C", hoverTo: "#429CE4", accentColor: "#429CE4", order: 0 },
  { title: "Parent Portal",            emoji: "👨‍👩‍👧", iconName: "Users",         desc: "Instant tracking companion providing real-time data sync, fee alerts, and direct chats.",       points: ["Real-time student updates","Fee payment alerts","Direct communication with teachers","Daily activity reports"],                hoverFrom: "#6A7626", hoverTo: "#4F581D", accentColor: "#6A7626", order: 1 },
  { title: "Online Fee Management",    emoji: "💳", iconName: "CreditCard",    desc: "Secure banking integration handling automatic reminders, instant receipts, and payouts.",       points: ["UPI/card/net banking integration","Auto fee reminders","Downloadable receipts","Pending fee analytics"],                         hoverFrom: "#FFA600", hoverTo: "#ED6708", accentColor: "#FFA600", order: 2 },
  { title: "AI-Based Features",        emoji: "🧠", iconName: "Brain",         desc: "Smarter school intelligence systems generating predictions, notes, and report remarks.",         points: ["AI chatbot for student queries","Smart performance prediction","Personalized study recommendations","AI-generated report cards/remarks"], hoverFrom: "#285E89", hoverTo: "#429CE4", accentColor: "#429CE4", order: 3 },
  { title: "Smart Attendance System",  emoji: "📅", iconName: "Fingerprint",   desc: "Instant roll-calls utilizing dynamic biometric readers, QR checks, and fast parent alerts.",    points: ["Face recognition attendance","RFID/QR code attendance","Biometric integration","Instant parent SMS alerts for absentees"],       hoverFrom: "#6A7626", hoverTo: "#4F581D", accentColor: "#6A7626", order: 4 },
  { title: "Learning Management",      emoji: "📚", iconName: "Laptop",        desc: "Comprehensive virtual classrooms allowing easy study uploads, recordings, and gradings.",         points: ["Online classes integration","Study materials & notes upload","Assignment submission portal","Recorded lecture access"],              hoverFrom: "#FFA600", hoverTo: "#ED6708", accentColor: "#FFA600", order: 5 },
  { title: "Communication Features",   emoji: "💬", iconName: "MessageSquare", desc: "Integrated micro-sockets connecting chat channels, live broadcasts, and meet systems.",           points: ["Teacher-parent chat","Broadcast messaging","Email/SMS integration","Video meeting integration"],                                   hoverFrom: "#1D496C", hoverTo: "#FFA600", accentColor: "#1D496C", order: 6 },
];

type Card = {
  _id?: string;
  title: string;
  emoji: string;
  iconName: string;
  desc: string;
  points: string[];
  hoverFrom: string;
  hoverTo: string;
  accentColor: string;
  order: number;
};

const EMPTY_CARD: Omit<Card, "order"> = {
  title: "",
  emoji: "📋",
  iconName: "Layers",
  desc: "",
  points: [""],
  hoverFrom: "#1D496C",
  hoverTo: "#429CE4",
  accentColor: "#429CE4",
};

export default function ModulesGridPage() {
  const confirm = useConfirm();
  const [cards, setCards] = useState<Card[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDbConnected, setIsDbConnected] = useState(false);

  // Modal state
  const [isOpen, setIsOpen] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [form, setForm] = useState<Omit<Card, "order">>({ ...EMPTY_CARD });
  const [pointInput, setPointInput] = useState("");

  useEffect(() => { loadCards(); }, []);

  const loadCards = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/landing/settings?t=${Date.now()}`);
      const data = await res.json();
      if (data.success) {
        setIsDbConnected(true);
        const loaded = data.settings?.modulesGridCards;
        if (Array.isArray(loaded) && loaded.length > 0) {
          setCards(loaded.map((c: Card, i: number) => ({ ...c, order: i })));
        } else {
          setCards(DEFAULT_CARDS.map((c, i) => ({ ...c, order: i })));
        }
      } else {
        setIsDbConnected(false);
        setCards(DEFAULT_CARDS.map((c, i) => ({ ...c, order: i })));
      }
    } catch {
      setIsDbConnected(false);
      setCards(DEFAULT_CARDS.map((c, i) => ({ ...c, order: i })));
    } finally {
      setIsLoading(false);
    }
  };

  const saveCards = async (list: Card[]) => {
    setIsSaving(true);
    try {
      const ordered = list.map((c, i) => ({ ...c, order: i }));
      const res = await fetch("/api/landing/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modulesGridCards: ordered }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Modules grid cards saved!");
        setCards(ordered);
      } else {
        toast.error(data.message || "Save failed");
      }
    } catch {
      toast.error("Connection error while saving");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Reorder ───────────────────────────────────────────────────────────────
  const move = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= cards.length) return;
    const u = [...cards];
    [u[idx], u[newIdx]] = [u[newIdx], u[idx]];
    setCards(u);
  };

  const deleteCard = async (idx: number) => {
    if (!(await confirm("Delete this card?"))) return;
    setCards(cards.filter((_, i) => i !== idx));
  };

  // ── Modal helpers ─────────────────────────────────────────────────────────
  const openNew = () => {
    setEditingIdx(null);
    setForm({ ...EMPTY_CARD });
    setPointInput("");
    setIsOpen(true);
  };

  const openEdit = (idx: number) => {
    setEditingIdx(idx);
    setForm({ ...cards[idx] });
    setPointInput("");
    setIsOpen(true);
  };

  const closeModal = () => { setIsOpen(false); setEditingIdx(null); };

  const addPoint = () => {
    const t = pointInput.trim();
    if (!t) return;
    setForm(f => ({ ...f, points: [...f.points, t] }));
    setPointInput("");
  };

  const removePoint = (pi: number) => setForm(f => ({ ...f, points: f.points.filter((_, i) => i !== pi) }));

  const updatePoint = (pi: number, val: string) =>
    setForm(f => ({ ...f, points: f.points.map((p, i) => i === pi ? val : p) }));

  const applyPreset = (preset: typeof COLOR_PRESETS[0]) => {
    setForm(f => ({ ...f, hoverFrom: preset.hoverFrom, hoverTo: preset.hoverTo, accentColor: preset.accent }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.desc.trim()) {
      toast.error("Title and description are required");
      return;
    }
    const cleanPoints = form.points.filter(p => p.trim());
    const card: Card = { ...form, points: cleanPoints, order: editingIdx !== null ? cards[editingIdx].order : cards.length };
    if (editingIdx !== null) {
      const u = [...cards];
      u[editingIdx] = card;
      setCards(u);
      toast.success("Card updated! Click Save to sync.");
    } else {
      setCards([...cards, card]);
      toast.success("Card added! Click Save to sync.");
    }
    closeModal();
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-[#1D496C] via-[#285E89] to-[#6A7626] p-6 text-white shadow-lg md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 border border-white/20">
                <LayoutGrid className="h-5 w-5 text-[#E4FF4C]" />
              </div>
              <h2 className="text-2xl font-black md:text-3xl">Modules Grid Cards</h2>
            </div>
            <p className="text-white/80 max-w-xl text-sm leading-relaxed">
              Manage the "Complete Educational Ecosystem Grids" cards on the public Modules page. Add, edit, reorder, or remove module cards — changes sync live to the website.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {isDbConnected ? (
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 font-bold px-3 py-1.5 text-xs">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>MongoDB Live
              </span>
            ) : (
              <span className="flex items-center gap-1.5 rounded-full bg-rose-500/20 border border-rose-400/30 text-rose-200 font-bold px-3 py-1.5 text-xs">
                <span className="h-2 w-2 rounded-full bg-rose-400 animate-ping"></span>Offline (File Store)
              </span>
            )}
            <Button onClick={openNew} className="rounded-xl bg-[#E4FF4C] text-[#1D496C] hover:bg-white font-black shadow-md">
              <Plus className="mr-2 h-4 w-4" /> Add Card
            </Button>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <p className="text-sm text-slate-500 font-medium">
          {cards.length} card{cards.length !== 1 ? "s" : ""} · Drag reorder using ↑ ↓ arrows
        </p>
        <div className="flex gap-3">
          <Button
            onClick={() => { setCards(DEFAULT_CARDS.map((c, i) => ({ ...c, order: i }))); toast.success("Reset to defaults. Click Save to persist."); }}
            variant="outline"
            className="rounded-xl border-slate-200 text-slate-600 hover:border-rose-200 hover:text-rose-600 font-bold text-sm"
          >
            <RotateCcw className="mr-2 h-4 w-4" /> Reset Defaults
          </Button>
          <Button
            onClick={() => saveCards(cards)}
            disabled={isSaving}
            className="rounded-xl bg-gradient-to-r from-[#1D496C] to-[#285E89] text-white font-bold px-6 shadow-lg hover:opacity-90"
          >
            {isSaving ? <><RefreshCw className="mr-2 h-4 w-4 animate-spin" />Saving...</> : <><Save className="mr-2 h-4 w-4" />Save to Database</>}
          </Button>
          <Button variant="outline" onClick={loadCards} disabled={isLoading} className="rounded-xl border-slate-200 text-slate-600 font-bold">
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Cards Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#1D496C] border-t-transparent"></div>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence initial={false}>
            {cards.map((card, idx) => (
              <motion.div
                key={`card-${idx}`}
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.94, height: 0 }}
                transition={{ duration: 0.2 }}
                className="group relative bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all overflow-hidden"
              >
                {/* Color accent top bar */}
                <div className="h-1 w-full" style={{ background: `linear-gradient(to right, ${card.hoverFrom}, ${card.hoverTo})` }}></div>

                <div className="p-5 space-y-3">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-10 w-10 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0"
                        style={{ background: `linear-gradient(135deg, ${card.hoverFrom}, ${card.hoverTo})` }}
                      >
                        {ICON_MAP[card.iconName] || <Layers className="h-5 w-5" />}
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-wider">{card.emoji} #{idx + 1}</p>
                        <h4 className="text-sm font-black text-slate-800 leading-tight">{card.title}</h4>
                      </div>
                    </div>
                    {/* Reorder */}
                    <div className="flex flex-col gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => move(idx, -1)} disabled={idx === 0} className="h-5 w-5 flex items-center justify-center rounded text-slate-300 hover:text-[#1D496C] disabled:opacity-20 transition-colors">
                        <ChevronUp className="h-4 w-4" />
                      </button>
                      <button onClick={() => move(idx, 1)} disabled={idx === cards.length - 1} className="h-5 w-5 flex items-center justify-center rounded text-slate-300 hover:text-[#1D496C] disabled:opacity-20 transition-colors">
                        <ChevronDown className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-500 font-medium leading-relaxed line-clamp-2">{card.desc}</p>

                  {/* Points */}
                  <ul className="space-y-1">
                    {card.points.slice(0, 4).map((pt, pi) => (
                      <li key={pi} className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" style={{ color: card.accentColor }} />
                        {pt}
                      </li>
                    ))}
                    {card.points.length > 4 && <li className="text-[10px] text-slate-400 pl-5">+{card.points.length - 4} more…</li>}
                  </ul>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t border-slate-50">
                    <Button size="sm" variant="outline" onClick={() => openEdit(idx)} className="flex-1 rounded-lg text-slate-600 border-slate-200 hover:border-[#1D496C] hover:text-[#1D496C] text-xs font-bold">
                      <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteCard(idx)} className="rounded-lg text-rose-500 hover:bg-rose-50 text-xs font-bold">
                      <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Add card placeholder */}
          <motion.button
            layout
            onClick={openNew}
            className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-8 text-slate-400 hover:border-[#1D496C]/40 hover:text-[#1D496C] hover:bg-[#1D496C]/5 transition-all min-h-[200px]"
          >
            <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center">
              <Plus className="h-6 w-6" />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold">Add New Card</p>
              <p className="text-xs opacity-70 mt-1">Click to create a module card</p>
            </div>
          </motion.button>
        </div>
      )}

      {/* ── Add / Edit Modal ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/60 p-4 backdrop-blur-sm overflow-y-auto py-8"
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.97 }}
              className="relative w-full max-w-2xl rounded-2xl border border-slate-100 bg-white shadow-2xl"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
                <div>
                  <h3 className="text-lg font-black text-slate-800">{editingIdx !== null ? "Edit Module Card" : "Add New Module Card"}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Fill in the card details — title, icon, description, and points</p>
                </div>
                <Button variant="ghost" size="icon" onClick={closeModal} className="rounded-full text-slate-400 hover:text-slate-900">
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
                {/* Title & Emoji */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2 space-y-1.5">
                    <Label className="text-xs font-black text-slate-600 uppercase tracking-wider">Card Title *</Label>
                    <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Student Dashboard" className="rounded-xl border-slate-200 focus:border-[#1D496C]" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-black text-slate-600 uppercase tracking-wider">Emoji</Label>
                    <Input value={form.emoji} onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))} placeholder="e.g. 📚" className="rounded-xl border-slate-200 text-xl text-center" maxLength={4} />
                  </div>
                </div>

                {/* Icon picker */}
                <div className="space-y-2">
                  <Label className="text-xs font-black text-slate-600 uppercase tracking-wider">Lucide Icon</Label>
                  <div className="grid grid-cols-5 sm:grid-cols-8 gap-2">
                    {ICON_NAMES.map(name => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, iconName: name }))}
                        title={name}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all text-[9px] font-bold ${form.iconName === name ? "border-[#1D496C] bg-[#1D496C]/10 text-[#1D496C]" : "border-slate-100 hover:border-slate-300 text-slate-500"}`}
                      >
                        {ICON_MAP[name]}
                        <span className="truncate w-full text-center">{name.substring(0, 6)}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-black text-slate-600 uppercase tracking-wider">Description *</Label>
                  <Textarea
                    value={form.desc}
                    onChange={e => setForm(f => ({ ...f, desc: e.target.value }))}
                    placeholder="Brief description of this module..."
                    rows={2}
                    className="rounded-xl border-slate-200 focus:border-[#1D496C] text-sm leading-relaxed"
                    required
                  />
                </div>

                {/* Bullet points */}
                <div className="space-y-2">
                  <Label className="text-xs font-black text-slate-600 uppercase tracking-wider">Feature Points</Label>
                  <div className="space-y-2">
                    {form.points.map((pt, pi) => (
                      <div key={pi} className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-slate-300 shrink-0" />
                        <Input
                          value={pt}
                          onChange={e => updatePoint(pi, e.target.value)}
                          placeholder={`Point ${pi + 1}`}
                          className="rounded-xl border-slate-200 text-sm flex-1"
                        />
                        <button type="button" onClick={() => removePoint(pi)} className="h-7 w-7 flex items-center justify-center rounded-lg text-rose-400 hover:bg-rose-50 transition-colors shrink-0">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <Input
                        value={pointInput}
                        onChange={e => setPointInput(e.target.value)}
                        placeholder="Type a point and press Add..."
                        className="rounded-xl border-slate-200 text-sm flex-1"
                        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addPoint(); } }}
                      />
                      <Button type="button" onClick={addPoint} variant="outline" className="rounded-xl border-slate-200 text-[#1D496C] font-bold shrink-0">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Color presets */}
                <div className="space-y-2">
                  <Label className="text-xs font-black text-slate-600 uppercase tracking-wider">Hover Color Theme</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {COLOR_PRESETS.map(preset => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => applyPreset(preset)}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border-2 transition-all text-xs font-bold ${
                          form.hoverFrom === preset.hoverFrom && form.hoverTo === preset.hoverTo
                            ? "border-slate-400 bg-slate-50"
                            : "border-slate-100 hover:border-slate-300"
                        }`}
                      >
                        <div className="h-5 w-5 rounded-lg shrink-0" style={{ background: `linear-gradient(135deg, ${preset.hoverFrom}, ${preset.hoverTo})` }}></div>
                        <span className="text-slate-600 truncate">{preset.label}</span>
                        {form.hoverFrom === preset.hoverFrom && <Check className="h-3.5 w-3.5 text-emerald-500 ml-auto shrink-0" />}
                      </button>
                    ))}
                  </div>

                  {/* Custom colors */}
                  <div className="grid grid-cols-3 gap-3 pt-1">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">From Color</label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={form.hoverFrom} onChange={e => setForm(f => ({ ...f, hoverFrom: e.target.value }))} className="h-8 w-8 rounded-lg border border-slate-200 cursor-pointer" />
                        <Input value={form.hoverFrom} onChange={e => setForm(f => ({ ...f, hoverFrom: e.target.value }))} className="rounded-lg border-slate-200 text-xs font-mono flex-1 h-8" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">To Color</label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={form.hoverTo} onChange={e => setForm(f => ({ ...f, hoverTo: e.target.value }))} className="h-8 w-8 rounded-lg border border-slate-200 cursor-pointer" />
                        <Input value={form.hoverTo} onChange={e => setForm(f => ({ ...f, hoverTo: e.target.value }))} className="rounded-lg border-slate-200 text-xs font-mono flex-1 h-8" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Accent Color</label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={form.accentColor} onChange={e => setForm(f => ({ ...f, accentColor: e.target.value }))} className="h-8 w-8 rounded-lg border border-slate-200 cursor-pointer" />
                        <Input value={form.accentColor} onChange={e => setForm(f => ({ ...f, accentColor: e.target.value }))} className="rounded-lg border-slate-200 text-xs font-mono flex-1 h-8" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Preview */}
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Live Preview</p>
                  <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
                    <div className="h-1" style={{ background: `linear-gradient(to right, ${form.hoverFrom}, ${form.hoverTo})` }}></div>
                    <div className="p-4 space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl flex items-center justify-center text-white" style={{ background: `linear-gradient(135deg, ${form.hoverFrom}, ${form.hoverTo})` }}>
                          {ICON_MAP[form.iconName] || <Layers className="h-5 w-5" />}
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-500">{form.emoji}</p>
                          <p className="text-sm font-black text-slate-800">{form.title || "Card Title"}</p>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">{form.desc || "Card description will appear here..."}</p>
                      {form.points.filter(p => p.trim()).slice(0, 3).map((pt, pi) => (
                        <div key={pi} className="flex items-center gap-2 text-xs text-slate-600">
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" style={{ color: form.accentColor }} />
                          {pt}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                  <Button type="button" variant="outline" onClick={closeModal} className="rounded-xl font-bold">Cancel</Button>
                  <Button type="submit" className="rounded-xl bg-gradient-to-r from-[#1D496C] to-[#285E89] text-white font-bold px-6 shadow-md">
                    <Save className="mr-2 h-4 w-4" />
                    {editingIdx !== null ? "Update Card" : "Add Card"}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
