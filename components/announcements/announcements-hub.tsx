"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Megaphone,
  Plus,
  Trash2,
  Edit3,
  Loader2,
  X,
  Calendar,
  Users,
  Bell,
  Search,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Flame,
  Info,
  RefreshCw,
  Eye,
  Send,
  Building,
  GraduationCap,
  HeartHandshake,
  Bus,
  CheckCircle2,
  UserCheck,
  School,
  Sparkles,
  ChevronDown,
  User,
  Filter,
  BookOpen,
  BookMarked,
  DollarSign,
  CheckSquare,
  Square,
  Check,
  Package,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  getAnnouncementRecipients,
  type AnnouncementResponse,
  type AnnouncementPayload,
  type AnnouncementRecipient,
} from "@/lib/principal";
import { getSchoolClasses } from "@/lib/clerk/classes";
import { getDivisions } from "@/lib/clerk/divisions";
import { fetchWithAuth } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export interface AnnouncementsHubProps {
  roleTitle: string;
  canCreate?: boolean;
  accentColor?: "indigo" | "emerald" | "blue" | "amber" | "purple" | "rose" | "teal";
  pageTitle?: string;
  pageSubtitle?: string;
}

interface StudentOption {
  id: number;
  name?: string;
  surname?: string;
  full_name?: string;
  roll_no?: string | number;
  division?: string;
  school_class?: number | { id: number; school_class: string };
  class_name?: string;
  mobile?: string;
}

interface ClassOption {
  id: number;
  school_class: string;
}

interface DivisionOption {
  id?: number;
  division: string;
  SchoolClass?: number | { id: number; school_class: string } | null;
  school_class?: number | null;
  class_name?: string;
}

export const TARGET_ROLE_OPTIONS = [
  { value: "STUDENT", label: "Student", desc: "Student portal & learners", icon: GraduationCap },
  { value: "PARENT", label: "Parent", desc: "Parent portal & guardians", icon: HeartHandshake },
  { value: "TEACHER", label: "Teacher", desc: "Faculty & academic staff", icon: BookOpen },
  { value: "PRINCIPAL", label: "Principal", desc: "School administration & leadership", icon: ShieldCheck },
  { value: "TRUSTEE", label: "Trustee", desc: "Trustee & executive management", icon: Building },
  { value: "CLERK", label: "Clerk", desc: "Office administration & clerks", icon: Users },
  { value: "FEE-MANAGER", label: "Fee Manager", desc: "Accounts & finance department", icon: DollarSign },
  { value: "LIBRARIAN", label: "Librarian", desc: "Library & circulation desk", icon: BookMarked },
  { value: "TRANSPORT", label: "Transport", desc: "Transport fleet & drivers", icon: Bus },
  { value: "INVENTORY", label: "Inventory", desc: "Inventory & assets department", icon: Package },
];

const ALL_AUDIENCE_OPTIONS = [
  { value: "ALL", label: "Everyone (All Roles)", desc: "School-wide broadcast to all panels", icon: Users },
  { value: "STUDENT", label: "Students", desc: "Visible exclusively on student portal", icon: GraduationCap },
  { value: "PARENT", label: "Parents", desc: "Visible exclusively on parent portal", icon: HeartHandshake },
  { value: "TEACHER", label: "Teachers", desc: "Academic staff notices & circulars", icon: BookOpen },
  { value: "PRINCIPAL", label: "Principal", desc: "School leadership notices", icon: ShieldCheck },
  { value: "TRUSTEE", label: "Trustees", desc: "Trustee & executive circulars", icon: Building },
  { value: "CLERK", label: "Administration & Clerks", desc: "Administrative circulars", icon: Users },
  { value: "FEE-MANAGER", label: "Accounts & Fees", desc: "Fee department notices", icon: DollarSign },
  { value: "LIBRARIAN", label: "Librarians", desc: "Library notices & updates", icon: BookMarked },
  { value: "TRANSPORT", label: "Transport Department", desc: "Bus & route announcements", icon: Bus },
  { value: "INVENTORY", label: "Inventory Department", desc: "Warehouse & asset circulars", icon: Package },
];

const TEACHER_AUDIENCE_OPTIONS = [
  { value: "STUDENT", label: "Students Only", desc: "Notice for student portal only", icon: GraduationCap },
  { value: "PARENT", label: "Parents Only", desc: "Notice for parent portal only", icon: HeartHandshake },
  { value: "TEACHER", label: "Other Teachers", desc: "Staff circular for fellow teachers", icon: BookOpen },
  { value: "ALL", label: "Everyone (All Roles)", desc: "School-wide broadcast", icon: Users },
];

const PRIORITY_OPTIONS = [
  {
    value: "NORMAL",
    label: "Normal Notice",
    desc: "General updates & standard circulars",
    badgeBg: "bg-indigo-50 dark:bg-indigo-950/60 text-[#5826df] dark:text-indigo-300 border-indigo-200/80",
    icon: Info,
    color: "#5826df",
  },
  {
    value: "IMPORTANT",
    label: "Important",
    desc: "High priority event or deadline",
    badgeBg: "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200",
    icon: AlertTriangle,
    color: "#d97706",
  },
  {
    value: "URGENT",
    label: "Urgent Alert",
    desc: "Critical emergency or urgent action needed",
    badgeBg: "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200",
    icon: Flame,
    color: "#e11d48",
  },
];

function getPriorityBadge(priority?: string) {
  const p = (priority || "NORMAL").toUpperCase();
  if (p === "URGENT") {
    return (
      <Badge className="bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
        <Flame className="w-3 h-3 text-rose-600 dark:text-rose-400" />
        Urgent Alert
      </Badge>
    );
  }
  if (p === "IMPORTANT") {
    return (
      <Badge className="bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
        <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
        Important
      </Badge>
    );
  }
  return (
    <Badge className="bg-indigo-50 text-[#5826df] dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
      <Info className="w-3 h-3 text-[#5826df]" />
      Normal
    </Badge>
  );
}

function getAudienceBadge(announcementFor?: string, isEveryone?: boolean | string) {
  const isAll =
    String(isEveryone) === "true" ||
    isEveryone === true ||
    (announcementFor || "").toUpperCase() === "ALL" ||
    !announcementFor;
  if (isAll) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80 text-[11px] font-bold shadow-2xs">
        <Users className="w-3 h-3 text-emerald-600" /> All Roles (Everyone)
      </span>
    );
  }

  const parts = announcementFor.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length > 1) {
    const labels = parts.map((val) => {
      const match = TARGET_ROLE_OPTIONS.find((a) => a.value === val.toUpperCase());
      return match ? match.label : val;
    });
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200 text-[11px] font-bold shadow-2xs">
        <Users className="w-3 h-3 text-indigo-600" /> {labels.join(" + ")}
      </span>
    );
  }

  const match = TARGET_ROLE_OPTIONS.find((a) => a.value === announcementFor?.toUpperCase()) ||
    ALL_AUDIENCE_OPTIONS.find((a) => a.value === announcementFor?.toUpperCase());
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 text-[11px] font-bold shadow-2xs">
      <Building className="w-3 h-3 text-slate-500" /> {match?.label ?? announcementFor}
    </span>
  );
}

function getTargetScopeBadge(item: AnnouncementResponse) {
  if (item.target_user_name || item.target_user) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 text-[11px] font-bold shadow-2xs">
        <UserCheck className="w-3 h-3 text-blue-600" />
        Individual: {item.target_user_name || `User #${item.target_user}`}
      </span>
    );
  }
  if (item.target_student_name || item.target_student) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-purple-50 text-[#5826df] dark:bg-purple-950/50 dark:text-purple-300 border border-[#5826df]/25 text-[11px] font-bold shadow-2xs">
        <UserCheck className="w-3 h-3 text-[#5826df]" />
        Student: {item.target_student_name || `ID #${item.target_student}`}
      </span>
    );
  }
  if (item.target_class_name || item.target_class) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 border border-sky-200 dark:border-sky-800/80 text-[11px] font-bold shadow-2xs">
        <School className="w-3 h-3 text-sky-600" />
        {item.target_class_name || `Class #${item.target_class}`}
        {item.target_division ? ` - Div ${item.target_division}` : ""}
      </span>
    );
  }
  return null;
}

function capitalizeFirstLetter(str?: string) {
  if (!str) return "";
  const trimmed = str.trim();
  if (!trimmed) return "";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function formatDateDisplay(dateStr?: string) {
  if (!dateStr) return "N/A";
  try {
    const d = new Date(dateStr);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

export function AnnouncementsHub({
  roleTitle,
  canCreate = false,
  pageTitle,
  pageSubtitle,
}: AnnouncementsHubProps) {
  const [announcements, setAnnouncements] = useState<AnnouncementResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAudience, setSelectedAudience] = useState<string>("ALL_FILTER");
  const [selectedPriority, setSelectedPriority] = useState<string>("ALL_PRIORITY");

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AnnouncementResponse | null>(null);
  const [viewingItem, setViewingItem] = useState<AnnouncementResponse | null>(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<AnnouncementResponse | null>(null);
  const [deleting, setDeleting] = useState(false);

  const isTeacherRole = roleTitle.toLowerCase().includes("teacher");

  const fetchAnnouncementsList = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await getAnnouncements();
      const sorted = [...data].sort((a, b) => {
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      });
      setAnnouncements(sorted);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load announcements.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncementsList();

    // Listen for WebSocket real-time broadcast events
    const handleWsAnnouncement = (e: Event) => {
      const customEvt = e as CustomEvent<AnnouncementResponse>;
      if (customEvt.detail) {
        setAnnouncements((prev) => {
          const exists = prev.some((item) => item.id === customEvt.detail.id);
          if (exists) {
            return prev.map((item) => (item.id === customEvt.detail.id ? customEvt.detail : item));
          }
          return [customEvt.detail, ...prev];
        });
      }
    };

    window.addEventListener("announcement_received", handleWsAnnouncement);
    return () => {
      window.removeEventListener("announcement_received", handleWsAnnouncement);
    };
  }, [fetchAnnouncementsList]);

  // Derived stats
  const totalCount = announcements.length;
  const urgentCount = announcements.filter((a) => (a.priority || "").toUpperCase() === "URGENT").length;
  const importantCount = announcements.filter((a) => (a.priority || "").toUpperCase() === "IMPORTANT").length;
  const normalCount = announcements.filter((a) => (a.priority || "NORMAL").toUpperCase() === "NORMAL").length;

  // Filtered List
  const filteredAnnouncements = useMemo(() => {
    return announcements.filter((item) => {
      // Search text
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.title?.toLowerCase().includes(q);
        const matchDesc = item.description?.toLowerCase().includes(q);
        const matchAuthor =
          item.created_by_name?.toLowerCase().includes(q) ||
          item.created_by_role?.toLowerCase().includes(q);
        const matchStudent = item.target_student_name?.toLowerCase().includes(q);
        const matchTargetUser = item.target_user_name?.toLowerCase().includes(q);
        const matchAudience = item.announcement_for?.toLowerCase().includes(q);
        const matchClass = item.target_class_name?.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchAuthor && !matchStudent && !matchTargetUser && !matchAudience && !matchClass) return false;
      }
      // Priority filter
      if (selectedPriority !== "ALL_PRIORITY") {
        const itemPriority = (item.priority || "NORMAL").toUpperCase();
        if (itemPriority !== selectedPriority) return false;
      }
      // Audience filter
      if (selectedAudience !== "ALL_FILTER") {
        const isAll =
          String(item.is_everyone) === "true" ||
          item.is_everyone === true ||
          (item.announcement_for || "").toUpperCase() === "ALL";

        if (selectedAudience === "ALL") {
          if (!isAll) return false;
        } else if (selectedAudience === "PARTICULAR_PERSON" || selectedAudience === "PARTICULAR_STUDENT") {
          if (!item.target_student && !item.target_student_name && !item.target_user && !item.target_user_name) return false;
        } else if (selectedAudience === "CLASS_TARGET") {
          if (!item.target_class && !item.target_class_name) return false;
        } else if (selectedAudience === "STUDENTS_PARENTS") {
          const forVal = (item.announcement_for || "").toUpperCase();
          if (!isAll && !forVal.includes("STUDENT") && !forVal.includes("PARENT")) return false;
        } else {
          // Specific role filter (matches if school-wide OR if the role is included in announcement_for)
          if (isAll) return true;
          const roles = (item.announcement_for || "").split(",").map((r) => r.trim().toUpperCase());
          if (!roles.includes(selectedAudience.toUpperCase())) return false;
        }
      }
      return true;
    });
  }, [announcements, searchQuery, selectedPriority, selectedAudience]);

  // Handle Delete
  const handleDeleteConfirm = async () => {
    if (!deleteConfirmItem) return;
    setDeleting(true);
    try {
      await deleteAnnouncement(deleteConfirmItem.id);
      setAnnouncements((prev) => prev.filter((a) => a.id !== deleteConfirmItem.id));
      toast.success("Announcement removed successfully.");
      setDeleteConfirmItem(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete announcement.");
    } finally {
      setDeleting(false);
    }
  };

  const defaultTitle = canCreate
    ? `${roleTitle} Announcements & Circulars`
    : `${roleTitle} Notice Board & Announcements`;

  const defaultSubtitle = canCreate
    ? isTeacherRole
      ? "Create and broadcast academic notices, class circulars, or specific student notes."
      : "Create, broadcast, and monitor active school-wide and role-targeted circulars."
    : "Stay updated with important announcements, circulars, and notices from school administration.";

  return (
    <div className="space-y-3 sm:space-y-4 max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-3 sm:py-4.5 pb-24 lg:pb-8 w-full min-w-0 overflow-x-hidden font-sans">
      {/* ─── TOP HEADER CARD ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 bg-white dark:bg-zinc-900 p-3 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-zinc-800 shadow-2xs w-full min-w-0 overflow-hidden">
        <div className="space-y-1 w-full min-w-0 flex-1">
          <div className="flex items-center gap-2.5 sm:gap-3 w-full min-w-0">
            <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#5826df]/15 to-[#6d3df5]/25 text-[#5826df] border border-[#5826df]/20 shadow-2xs shrink-0">
              <Megaphone className="h-5 w-5 sm:h-6 sm:w-6 stroke-[2.2]" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-sm sm:text-2xl font-black tracking-tight text-slate-900 dark:text-zinc-100 truncate">
                {pageTitle || defaultTitle}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-0.5 line-clamp-1 sm:line-clamp-2">
                {pageSubtitle || defaultSubtitle}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchAnnouncementsList(true)}
            disabled={refreshing}
            className="flex-1 sm:flex-initial h-10 rounded-2xl px-4 text-xs font-bold text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:border-[#5826df]/30 hover:bg-indigo-50/40 hover:text-[#5826df] gap-2 transition-all shadow-2xs justify-center"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin text-[#5826df]" : ""}`} />
            Refresh
          </Button>

          {canCreate && (
            <Button
              onClick={() => {
                setEditingItem(null);
                setModalOpen(true);
              }}
              className="flex-1 sm:flex-initial h-10 bg-gradient-to-r from-[#5826df] to-[#6d3df5] hover:from-[#4c1fc7] hover:to-[#5e2de0] text-white font-bold text-xs rounded-2xl px-5 gap-2 shadow-md shadow-[#5826df]/25 transition-all hover:shadow-[#5826df]/35 active:scale-[0.98] justify-center"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              New Announcement
            </Button>
          )}
        </div>
      </div>

      {/* ─── STAT CARDS ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <Card
          onClick={() => setSelectedPriority("ALL_PRIORITY")}
          className={`rounded-3xl border cursor-pointer transition-all duration-200 ${
            selectedPriority === "ALL_PRIORITY"
              ? "border-[#5826df] ring-2 ring-[#5826df]/20 bg-indigo-50/30 dark:bg-indigo-950/20 shadow-xs"
              : "border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-slate-300 shadow-2xs"
          }`}
        >
          <CardContent className="p-3.5 sm:p-5 flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-center text-[#5826df] shrink-0 shadow-2xs">
              <Bell className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 dark:text-zinc-400 uppercase tracking-wider truncate">Total Notices</p>
              <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-zinc-100">{totalCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card
          onClick={() => setSelectedPriority("URGENT")}
          className={`rounded-3xl border cursor-pointer transition-all duration-200 ${
            selectedPriority === "URGENT"
              ? "border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/30 dark:bg-rose-950/20 shadow-xs"
              : "border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-slate-300 shadow-2xs"
          }`}
        >
          <CardContent className="p-3.5 sm:p-5 flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-100 dark:border-rose-900/60 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0 shadow-2xs">
              <Flame className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 dark:text-zinc-400 uppercase tracking-wider truncate">Urgent Alerts</p>
              <p className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400">{urgentCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card
          onClick={() => setSelectedPriority("IMPORTANT")}
          className={`rounded-3xl border cursor-pointer transition-all duration-200 ${
            selectedPriority === "IMPORTANT"
              ? "border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/30 dark:bg-amber-950/20 shadow-xs"
              : "border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-slate-300 shadow-2xs"
          }`}
        >
          <CardContent className="p-3.5 sm:p-5 flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-100 dark:border-amber-900/60 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 shadow-2xs">
              <AlertTriangle className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 dark:text-zinc-400 uppercase tracking-wider truncate">Important</p>
              <p className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400">{importantCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card
          onClick={() => setSelectedPriority("NORMAL")}
          className={`rounded-3xl border cursor-pointer transition-all duration-200 ${
            selectedPriority === "NORMAL"
              ? "border-[#5826df] ring-2 ring-[#5826df]/20 bg-indigo-50/30 dark:bg-indigo-950/20 shadow-xs"
              : "border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-slate-300 shadow-2xs"
          }`}
        >
          <CardContent className="p-3.5 sm:p-5 flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-center text-[#5826df] shrink-0 shadow-2xs">
              <Info className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 dark:text-zinc-400 uppercase tracking-wider truncate">Normal Notices</p>
              <p className="text-xl sm:text-2xl font-black text-[#5826df] dark:text-indigo-400">{normalCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── SLEEK MODERN SEGMENTED FILTERS & SEARCH ──────────────────────── */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200/80 dark:border-zinc-800 p-4 sm:p-5 space-y-3.5 shadow-2xs">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-full lg:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by title, student, class, author..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-16 h-10 sm:h-11 text-xs rounded-2xl bg-slate-50/90 dark:bg-zinc-800/60 border-slate-200 dark:border-zinc-700 font-medium focus-visible:border-[#5826df] focus-visible:ring-2 focus-visible:ring-[#5826df]/20"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 px-2 py-0.5 rounded-lg bg-slate-200/60 dark:bg-zinc-700 transition-colors"
              >
                Clear
              </button>
            )}
          </div>

          {/* Priority Segmented Pills */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 dark:bg-zinc-800/80 rounded-2xl overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <button
              onClick={() => setSelectedPriority("ALL_PRIORITY")}
              className={`px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                selectedPriority === "ALL_PRIORITY"
                  ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-xs"
                  : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
              }`}
            >
              All Priorities
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300 font-black">
                {totalCount}
              </span>
            </button>

            <button
              onClick={() => setSelectedPriority("URGENT")}
              className={`px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                selectedPriority === "URGENT"
                  ? "bg-rose-500 text-white shadow-xs"
                  : "text-rose-600 dark:text-rose-400 hover:bg-rose-50/50"
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              Urgent
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-200 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 font-black">
                {urgentCount}
              </span>
            </button>

            <button
              onClick={() => setSelectedPriority("IMPORTANT")}
              className={`px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                selectedPriority === "IMPORTANT"
                  ? "bg-amber-500 text-white shadow-xs"
                  : "text-amber-600 dark:text-amber-400 hover:bg-amber-50/50"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Important
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-200 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 font-black">
                {importantCount}
              </span>
            </button>

            <button
              onClick={() => setSelectedPriority("NORMAL")}
              className={`px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                selectedPriority === "NORMAL"
                  ? "bg-[#5826df] text-white shadow-xs"
                  : "text-[#5826df] dark:text-indigo-400 hover:bg-indigo-50/50"
              }`}
            >
              <Info className="w-3.5 h-3.5" />
              Normal
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-200 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200 font-black">
                {normalCount}
              </span>
            </button>
          </div>
        </div>

        {/* Audience Filter Pills */}
        <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 flex items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pb-1 text-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1 mr-1">
            <Filter className="w-3 h-3 text-[#5826df]" /> Audience:
          </span>

          <button
            onClick={() => setSelectedAudience("ALL_FILTER")}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap shrink-0 ${
              selectedAudience === "ALL_FILTER"
                ? "bg-[#5826df] text-white shadow-xs"
                : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200"
            }`}
          >
            All Audiences
          </button>

          <button
            onClick={() => setSelectedAudience("ALL")}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              selectedAudience === "ALL"
                ? "bg-[#5826df] text-white shadow-xs"
                : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            School-Wide (Everyone)
          </button>

          <button
            onClick={() => setSelectedAudience("PARTICULAR_PERSON")}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              selectedAudience === "PARTICULAR_PERSON" || selectedAudience === "PARTICULAR_STUDENT"
                ? "bg-[#5826df] text-white shadow-xs"
                : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200"
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            Particular Individual
          </button>

          <button
            onClick={() => setSelectedAudience("CLASS_TARGET")}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              selectedAudience === "CLASS_TARGET"
                ? "bg-[#5826df] text-white shadow-xs"
                : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200"
            }`}
          >
            <School className="w-3.5 h-3.5" />
            Class Targeted
          </button>

          {TARGET_ROLE_OPTIONS.map((opt) => {
            const IconComponent = opt.icon;
            const isSelected = selectedAudience === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setSelectedAudience(opt.value)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-[#5826df] text-white shadow-xs"
                    : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200"
                }`}
              >
                <IconComponent className="w-3.5 h-3.5" />
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── ANNOUNCEMENTS FEED LIST ───────────────────────────────────── */}
      {loading ? (
        <div className="py-20 text-center flex flex-col items-center justify-center gap-3 bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200/80 dark:border-zinc-800 shadow-2xs">
          <Loader2 className="w-8 h-8 text-[#5826df] animate-spin" />
          <p className="text-xs font-bold text-slate-500">Loading notices and circulars...</p>
        </div>
      ) : filteredAnnouncements.length === 0 ? (
        <div className="py-20 text-center flex flex-col items-center justify-center gap-3 bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200/80 dark:border-zinc-800 shadow-2xs p-6">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center text-[#5826df] mb-1">
            <Megaphone className="w-7 h-7 stroke-[2]" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-zinc-200">
            {searchQuery || selectedPriority !== "ALL_PRIORITY" || selectedAudience !== "ALL_FILTER"
              ? "No matching announcements found"
              : "No active announcements right now"}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm">
            {searchQuery || selectedPriority !== "ALL_PRIORITY" || selectedAudience !== "ALL_FILTER"
              ? "Try resetting your search query or filters to see other notices."
              : canCreate
              ? "Click the 'New Announcement' button above to create and broadcast circulars to school staff, students, or parents."
              : "When the school principal, trustee, or staff publish announcements, they will appear here instantly."}
          </p>
          {canCreate && (
            <Button
              onClick={() => {
                setEditingItem(null);
                setModalOpen(true);
              }}
              className="mt-2 h-10 bg-gradient-to-r from-[#5826df] to-[#6d3df5] hover:from-[#4c1fc7] hover:to-[#5e2de0] text-white text-xs font-bold rounded-2xl px-5 gap-2 shadow-sm"
            >
              <Plus className="h-4 w-4" /> Create First Announcement
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAnnouncements.map((item) => {
            const hasManagePermission = canCreate && (item.can_manage ?? false);
            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200/80 dark:border-zinc-800 p-4 sm:p-5 shadow-2xs hover:border-[#5826df]/35 hover:shadow-md transition-all duration-200 flex flex-col justify-between gap-4 group"
              >
                {/* Header info */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                      {getPriorityBadge(item.priority)}
                      {getAudienceBadge(item.announcement_for, item.is_everyone)}
                      {getTargetScopeBadge(item)}
                    </div>

                    {/* Actions Menu */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setViewingItem(item)}
                        className="h-8 w-8 p-0 rounded-xl bg-indigo-50 text-[#5826df] hover:bg-[#5826df] hover:text-white transition-all shadow-2xs"
                        title="View Notice Details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>

                      {hasManagePermission && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingItem(item);
                              setModalOpen(true);
                            }}
                            className="h-8 w-8 p-0 rounded-xl bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white transition-all shadow-2xs"
                            title="Edit Notice"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeleteConfirmItem(item)}
                            className="h-8 w-8 p-0 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white transition-all shadow-2xs"
                            title="Delete Notice"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Title & Description preview */}
                  <div>
                    <h3
                      onClick={() => setViewingItem(item)}
                      className="text-sm sm:text-base font-black text-slate-900 dark:text-zinc-100 hover:text-[#5826df] dark:hover:text-indigo-400 transition-colors cursor-pointer line-clamp-2 first-letter:uppercase leading-snug"
                    >
                      {capitalizeFirstLetter(item.title)}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-zinc-300 mt-1.5 line-clamp-3 leading-relaxed first-letter:uppercase">
                      {capitalizeFirstLetter(item.description)}
                    </p>
                  </div>
                </div>

                {/* Footer metadata */}
                <div className="pt-3 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between gap-2 text-[11px] text-slate-400">
                  <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-zinc-300 truncate min-w-0">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#5826df] shrink-0" />
                    <span className="truncate font-bold text-slate-800 dark:text-zinc-200">
                      {item.is_created_by_me || (item.created_by_name || "").toLowerCase() === "created by me"
                        ? "Created by me"
                        : (item.created_by_name || item.created_by_role || "Administration")}
                    </span>
                    {item.created_by_role && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-indigo-50/80 dark:bg-zinc-800 text-[#5826df] dark:text-indigo-300 font-bold uppercase border border-indigo-100/60 dark:border-zinc-700 shrink-0">
                        {item.created_by_role}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0 font-mono text-[10px] text-slate-400">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{formatDateDisplay(item.created_at)}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ─── CREATE / EDIT MODAL ───────────────────────────────────────── */}
      <AnimatePresence>
        {modalOpen && (
          <AnnouncementFormModal
            announcement={editingItem}
            roleTitle={roleTitle}
            isTeacherRole={isTeacherRole}
            onClose={() => {
              setModalOpen(false);
              setEditingItem(null);
            }}
            onSaved={() => {
              fetchAnnouncementsList(true);
            }}
          />
        )}
      </AnimatePresence>

      {/* ─── DETAIL VIEW MODAL ─────────────────────────────────────────── */}
      <AnimatePresence>
        {viewingItem && (
          <AnnouncementDetailModal
            announcement={viewingItem}
            onClose={() => setViewingItem(null)}
          />
        )}
      </AnimatePresence>

      {/* ─── DELETE CONFIRM MODAL ──────────────────────────────────────── */}
      <AnimatePresence>
        {deleteConfirmItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs" onClick={() => setDeleteConfirmItem(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-sm p-6 z-10 border border-slate-200 dark:border-zinc-800 space-y-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-100 flex items-center justify-center mx-auto shadow-2xs">
                <Trash2 className="w-6 h-6 stroke-[2.2]" />
              </div>

              <div className="text-center space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100">Delete Announcement?</h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                  Are you sure you want to delete &ldquo;<span className="font-semibold text-slate-700 dark:text-zinc-300 first-letter:uppercase">{capitalizeFirstLetter(deleteConfirmItem.title)}</span>&rdquo;? This action cannot be undone.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setDeleteConfirmItem(null)}
                  disabled={deleting}
                  className="rounded-2xl h-10 text-xs font-bold border-slate-200 hover:bg-slate-50"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDeleteConfirm}
                  disabled={deleting}
                  className="bg-rose-600 hover:bg-rose-700 text-white rounded-2xl h-10 text-xs font-bold gap-2 shadow-sm shadow-rose-600/20"
                >
                  {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  Delete
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── ANNOUNCEMENT FORM MODAL (CREATE / EDIT) ─────────────────────────────────
function AnnouncementFormModal({
  announcement,
  roleTitle,
  isTeacherRole,
  onClose,
  onSaved,
}: {
  announcement: AnnouncementResponse | null;
  roleTitle: string;
  isTeacherRole: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!announcement;
  const [title, setTitle] = useState(announcement?.title ?? "");
  const [description, setDescription] = useState(announcement?.description ?? "");
  const [priority, setPriority] = useState<string>(announcement?.priority ?? "NORMAL");

  // Multi-Role Target Audience State
  const initialIsAll =
    announcement?.is_everyone === true ||
    String(announcement?.is_everyone) === "true" ||
    (announcement?.announcement_for || "").toUpperCase() === "ALL" ||
    (!announcement && !isTeacherRole);

  const initialRoles: string[] = useMemo(() => {
    if (initialIsAll) return TARGET_ROLE_OPTIONS.map((r) => r.value);
    if (announcement?.announcement_for) {
      return announcement.announcement_for
        .split(",")
        .map((r) => r.trim().toUpperCase())
        .filter(Boolean);
    }
    if (isTeacherRole) return ["STUDENT", "PARENT"];
    return TARGET_ROLE_OPTIONS.map((r) => r.value);
  }, [announcement, initialIsAll, isTeacherRole]);

  const [selectedRoles, setSelectedRoles] = useState<string[]>(initialRoles);
  const [isAllRoles, setIsAllRoles] = useState<boolean>(initialIsAll);

  // Target Scope: "BROADCAST" | "CLASS" | "INDIVIDUAL"
  const initialScope: "BROADCAST" | "CLASS" | "INDIVIDUAL" =
    announcement?.target_user || announcement?.target_student
      ? "INDIVIDUAL"
      : announcement?.target_class
      ? "CLASS"
      : "BROADCAST";
  const [targetScope, setTargetScope] = useState<"BROADCAST" | "CLASS" | "INDIVIDUAL">(initialScope);

  // Class & Division selection
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [divisions, setDivisions] = useState<DivisionOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>(
    announcement?.target_class ? String(announcement.target_class) : ""
  );
  const [selectedDivision, setSelectedDivision] = useState<string>(
    announcement?.target_division ? String(announcement.target_division) : ""
  );

  // Particular Individual Target State (For ANY role)
  const initialIndividualRole = announcement?.target_student
    ? "STUDENT"
    : announcement?.announcement_for && TARGET_ROLE_OPTIONS.some((r) => r.value === announcement.announcement_for?.toUpperCase())
    ? announcement.announcement_for.toUpperCase()
    : "STUDENT";
  const [individualRole, setIndividualRole] = useState<string>(initialIndividualRole);

  const initialRecipient: AnnouncementRecipient | null = announcement?.target_student
    ? {
        id: Number(announcement.target_student),
        student_id: Number(announcement.target_student),
        name: announcement.target_student_name || `Student #${announcement.target_student}`,
        role: "STUDENT",
        details: announcement.target_class_name ? `Class: ${announcement.target_class_name}` : undefined,
      }
    : announcement?.target_user
    ? {
        id: Number(announcement.target_user),
        user_id: Number(announcement.target_user),
        name: announcement.target_user_name || `User #${announcement.target_user}`,
        role: announcement.announcement_for || "STAFF",
      }
    : null;

  const [selectedRecipient, setSelectedRecipient] = useState<AnnouncementRecipient | null>(initialRecipient);
  const [recipientSearch, setRecipientSearch] = useState("");
  const [recipientsList, setRecipientsList] = useState<AnnouncementRecipient[]>([]);
  const [recipientsLoading, setRecipientsLoading] = useState(false);

  // Dynamic scope calculation based on selected roles
  const canTargetClass = isAllRoles || selectedRoles.includes("STUDENT") || selectedRoles.includes("PARENT");

  // Parent Guided Target State (Class -> Division -> Student -> Parent)
  const [parentClassId, setParentClassId] = useState<string>("");
  const [parentDivision, setParentDivision] = useState<string>("ALL");
  const [parentStudentId, setParentStudentId] = useState<number | null>(null);
  const [parentStudentsList, setParentStudentsList] = useState<AnnouncementRecipient[]>([]);
  const [parentStudentsLoading, setParentStudentsLoading] = useState(false);

  useEffect(() => {
    if (!canTargetClass && targetScope === "CLASS") {
      setTargetScope("BROADCAST");
    }
  }, [canTargetClass, targetScope]);

  const formatForInput = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
      return "";
    }
  };

  const [expiresAt, setExpiresAt] = useState<string>(
    announcement?.expires_at ? formatForInput(announcement.expires_at) : ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch classes and divisions on mount
  useEffect(() => {
    async function loadMeta() {
      try {
        const [clsList, divList] = await Promise.all([
          getSchoolClasses().catch(() => []),
          getDivisions().catch(() => []),
        ]);
        setClasses(clsList);
        setDivisions(divList);
      } catch {
        // Soft fail
      }
    }
    loadMeta();
  }, []);

  // Divisions available for parent selection
  const parentAvailableDivisions = useMemo(() => {
    if (!parentClassId) return [];
    const targetClassId = String(parentClassId);
    const selectedClassObj = classes.find((c) => String(c.id) === targetClassId);
    const selectedClassName = selectedClassObj?.school_class?.toLowerCase().trim();

    const uniqueDivs = new Set<string>();
    divisions.forEach((d) => {
      const rawClass =
        typeof d.SchoolClass === "object" && d.SchoolClass !== null
          ? (d.SchoolClass as { id: number }).id
          : (d.SchoolClass ?? d.school_class ?? (d as any).school_class_id);

      const className = d.class_name?.toLowerCase().trim();
      const matchById = rawClass !== undefined && rawClass !== null && String(rawClass) === targetClassId;
      const matchByName = selectedClassName && className && className === selectedClassName;

      if ((matchById || matchByName) && d.division) {
        let cleanDiv = String(d.division).trim();
        if (cleanDiv.toLowerCase().startsWith("div ")) cleanDiv = cleanDiv.slice(4).trim();
        else if (cleanDiv.toLowerCase().startsWith("div")) cleanDiv = cleanDiv.slice(3).trim();
        if (cleanDiv) uniqueDivs.add(cleanDiv.toUpperCase());
      }
    });
    return Array.from(uniqueDivs).sort();
  }, [divisions, parentClassId, classes]);

  // Load students for parent selection when Class & Division change
  useEffect(() => {
    if (targetScope === "INDIVIDUAL" && individualRole === "PARENT" && parentClassId) {
      let active = true;
      setParentStudentsLoading(true);
      getAnnouncementRecipients("STUDENT", "", {
        class_id: parentClassId,
        division: parentDivision && parentDivision !== "ALL" ? parentDivision : null,
      })
        .then((students) => {
          if (active) setParentStudentsList(students || []);
        })
        .catch(() => {
          if (active) setParentStudentsList([]);
        })
        .finally(() => {
          if (active) setParentStudentsLoading(false);
        });
      return () => {
        active = false;
      };
    }
  }, [targetScope, individualRole, parentClassId, parentDivision]);

  // Select parent by choosing a student ward
  const handleSelectParentForStudent = async (st: AnnouncementRecipient) => {
    setParentStudentId(st.id);
    try {
      const parents = await getAnnouncementRecipients("PARENT", "", { student_id: st.id });
      if (parents && parents.length > 0) {
        setSelectedRecipient(parents[0]);
      } else {
        const pName = st.father_name || st.mother_name || `Parent of ${st.name}`;
        setSelectedRecipient({
          id: st.id,
          student_id: st.id,
          user_id: st.user_id,
          name: pName,
          role: "PARENT",
          mobile: st.mobile,
          details: `Ward: ${st.name} (Class ${st.class_name || ""} ${st.division || ""}) • Ph: ${st.mobile || "N/A"}`,
        });
      }
    } catch {
      const pName = st.father_name || st.mother_name || `Parent of ${st.name}`;
      setSelectedRecipient({
        id: st.id,
        student_id: st.id,
        name: pName,
        role: "PARENT",
        mobile: st.mobile,
        details: `Ward: ${st.name} • Class: ${st.class_name || ""} ${st.division || ""}`,
      });
    }
  };

  // Fetch recipients when INDIVIDUAL scope is active and individualRole / search changes
  const fetchRecipients = useCallback(async (role: string, query: string) => {
    setRecipientsLoading(true);
    try {
      const data = await getAnnouncementRecipients(role, query);
      setRecipientsList(Array.isArray(data) ? data : []);
    } catch {
      setRecipientsList([]);
    } finally {
      setRecipientsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (targetScope === "INDIVIDUAL") {
      const timer = setTimeout(() => {
        fetchRecipients(individualRole, recipientSearch);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [targetScope, individualRole, recipientSearch, fetchRecipients]);

  // Compute divisions specifically belonging to the selected class
  const availableDivisions = useMemo(() => {
    if (!selectedClassId) return [];
    const targetClassId = String(selectedClassId);
    const selectedClassObj = classes.find((c) => String(c.id) === targetClassId);
    const selectedClassName = selectedClassObj?.school_class?.toLowerCase().trim();

    const uniqueDivs = new Set<string>();

    divisions.forEach((d) => {
      const rawClass =
        typeof d.SchoolClass === "object" && d.SchoolClass !== null
          ? (d.SchoolClass as { id: number }).id
          : (d.SchoolClass ?? d.school_class ?? (d as any).school_class_id);

      const className = d.class_name?.toLowerCase().trim();

      const matchById = rawClass !== undefined && rawClass !== null && String(rawClass) === targetClassId;
      const matchByName = selectedClassName && className && className === selectedClassName;

      if ((matchById || matchByName) && d.division) {
        let cleanDiv = String(d.division).trim();
        if (cleanDiv.toLowerCase().startsWith("div ")) {
          cleanDiv = cleanDiv.slice(4).trim();
        } else if (cleanDiv.toLowerCase().startsWith("div")) {
          cleanDiv = cleanDiv.slice(3).trim();
        }
        if (cleanDiv) uniqueDivs.add(cleanDiv.toUpperCase());
      }
    });

    return Array.from(uniqueDivs).sort();
  }, [divisions, selectedClassId, classes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please enter a notice title.");
      return;
    }
    if (!description.trim()) {
      setError("Please enter detailed announcement text.");
      return;
    }

    if (targetScope === "INDIVIDUAL" && !selectedRecipient) {
      setError(`Please select a specific individual ${individualRole.toLowerCase()} from the list.`);
      return;
    }

    if (targetScope === "CLASS" && !selectedClassId) {
      setError("Please select a target standard / class.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload: AnnouncementPayload = {
        title: capitalizeFirstLetter(title.trim()),
        description: capitalizeFirstLetter(description.trim()),
        priority: priority,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      };

      if (targetScope === "INDIVIDUAL") {
        if (!selectedRecipient) {
          setError("Please select a recipient.");
          setSaving(false);
          return;
        }
        payload.is_everyone = false;
        payload.announcement_for = individualRole;
        if (selectedRecipient.student_id) {
          payload.target_student = selectedRecipient.student_id;
        }
        if (selectedRecipient.user_id) {
          payload.target_user = selectedRecipient.user_id;
        }
        payload.target_class = null;
        payload.target_division = null;
      } else if (targetScope === "CLASS") {
        payload.is_everyone = false;
        payload.announcement_for = isAllRoles ? "STUDENT,PARENT" : selectedRoles.join(",");
        payload.target_class = Number(selectedClassId);
        payload.target_division = selectedDivision && selectedDivision !== "ALL" ? selectedDivision : null;
        payload.target_student = null;
        payload.target_user = null;
      } else {
        // Broadcast
        if (isAllRoles || selectedRoles.length === TARGET_ROLE_OPTIONS.length) {
          payload.is_everyone = true;
          payload.announcement_for = "ALL";
        } else {
          payload.is_everyone = false;
          payload.announcement_for = selectedRoles.join(",");
        }
        payload.target_class = null;
        payload.target_division = null;
        payload.target_student = null;
        payload.target_user = null;
      }

      if (isEdit && announcement) {
        await updateAnnouncement(announcement.id, payload);
        toast.success("Announcement updated successfully!");
      } else {
        await createAnnouncement(payload);
        toast.success("Announcement broadcasted successfully!");
      }

      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to publish announcement.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        className="relative bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-[95vw] sm:max-w-2xl p-4 sm:p-7 max-h-[90vh] overflow-y-auto z-10 border border-slate-200 dark:border-zinc-800 space-y-5"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-[#5826df]/15 to-[#6d3df5]/25 text-[#5826df] border border-[#5826df]/20 shadow-2xs">
              <Megaphone className="h-5 w-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-zinc-100">
                {isEdit ? "Edit Announcement" : "Create New Announcement"}
              </h2>
              <p className="text-xs text-slate-500">
                Broadcast circulars, notices, and alerts across school roles in real-time.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-2xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2.5 font-medium">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-700 dark:text-zinc-300 flex items-center gap-1">
              Announcement Title <span className="text-rose-500">*</span>
            </label>
            <Input
              placeholder="e.g., Mathematics Unit Test Schedule & Syllabus"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-11 text-xs rounded-2xl bg-slate-50/80 dark:bg-zinc-800/60 border-slate-200 dark:border-zinc-700 font-medium focus-visible:border-[#5826df] focus-visible:ring-2 focus-visible:ring-[#5826df]/20"
              required
            />
          </div>

          {/* Priority Selection Cards */}
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-700 dark:text-zinc-300">
              Priority Level
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {PRIORITY_OPTIONS.map((p) => {
                const isSelected = priority === p.value;
                const Icon = p.icon;
                return (
                  <div
                    key={p.value}
                    onClick={() => setPriority(p.value)}
                    className={`cursor-pointer p-3 rounded-2xl border transition-all flex flex-col justify-between gap-2 ${
                      isSelected
                        ? "border-[#5826df] bg-indigo-50/40 dark:bg-indigo-950/30 ring-2 ring-[#5826df]/20 shadow-2xs"
                        : "border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-800/40 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div
                        className="w-7 h-7 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: `${p.color}15`, color: p.color }}
                      >
                        <Icon className="w-4 h-4 stroke-[2.2]" />
                      </div>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-[#5826df]" />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-zinc-100">{p.label}</p>
                      <p className="text-[10px] text-slate-400 line-clamp-1">{p.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Target Audience: 9-Role Multi-Selection */}
          <div className="space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label className="text-xs font-black text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-[#5826df]" />
                  Target Audience Roles ({isAllRoles ? "All 9 Roles" : `${selectedRoles.length} Selected`})
                </label>
                <p className="text-[11px] text-slate-400">
                  Select one or more roles to send announcement to their panels, or click Everyone.
                </p>
              </div>

              {/* Master Everyone Toggle */}
              <button
                type="button"
                onClick={() => {
                  if (isAllRoles) {
                    setIsAllRoles(false);
                    setSelectedRoles(["STUDENT"]);
                  } else {
                    setIsAllRoles(true);
                    setSelectedRoles(TARGET_ROLE_OPTIONS.map((r) => r.value));
                  }
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  isAllRoles
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-200"
                }`}
              >
                <CheckCircle2 className={`w-3.5 h-3.5 ${isAllRoles ? "text-white" : "text-slate-400"}`} />
                <span>All Roles (Everyone)</span>
              </button>
            </div>

            {/* 10 Role Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {TARGET_ROLE_OPTIONS.map((item) => {
                const isSelected = isAllRoles || selectedRoles.includes(item.value);
                const Icon = item.icon;
                return (
                  <div
                    key={item.value}
                    onClick={() => {
                      if (isAllRoles) {
                        setIsAllRoles(false);
                        setSelectedRoles([item.value]);
                        setIndividualRole(item.value);
                        setSelectedRecipient(null);
                      } else {
                        if (selectedRoles.includes(item.value)) {
                          const updated = selectedRoles.filter((r) => r !== item.value);
                          if (updated.length === 0) {
                            setIsAllRoles(true);
                            setSelectedRoles(TARGET_ROLE_OPTIONS.map((r) => r.value));
                            setIndividualRole(TARGET_ROLE_OPTIONS[0].value);
                            setSelectedRecipient(null);
                          } else {
                            setSelectedRoles(updated);
                            setIndividualRole(updated[updated.length - 1]);
                            setSelectedRecipient(null);
                          }
                        } else {
                          const updated = [...selectedRoles, item.value];
                          if (updated.length === TARGET_ROLE_OPTIONS.length) {
                            setIsAllRoles(true);
                            setSelectedRoles(TARGET_ROLE_OPTIONS.map((r) => r.value));
                          } else {
                            setSelectedRoles(updated);
                          }
                          setIndividualRole(item.value);
                          setSelectedRecipient(null);
                        }
                      }
                    }}
                    className={`cursor-pointer p-2.5 rounded-2xl border transition-all flex flex-col justify-between gap-1.5 ${
                      isSelected
                        ? "border-[#5826df] bg-indigo-50/50 dark:bg-indigo-950/40 ring-1 ring-[#5826df]/30 shadow-2xs"
                        : "border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-800/40 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-7 h-7 rounded-xl bg-indigo-100/70 dark:bg-indigo-950/60 text-[#5826df] flex items-center justify-center shrink-0">
                        <Icon className="w-3.5 h-3.5 stroke-[2.2]" />
                      </div>
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                          isSelected ? "bg-[#5826df] text-white" : "border border-slate-300 dark:border-zinc-600"
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-zinc-100">{item.label}</p>
                      <p className="text-[10px] text-slate-400 line-clamp-1">{item.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Delivery Scope Selector */}
          <div className="p-4 rounded-3xl bg-slate-50/90 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700/80 space-y-3.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#5826df]" />
                Audience Scope & Delivery Target
              </label>
              <span className="text-[10px] font-bold text-[#5826df] bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full">
                {targetScope === "BROADCAST" ? "Role Broadcast" : targetScope === "CLASS" ? "Class Scope" : "Particular Individual"}
              </span>
            </div>

            {/* Scope Cards: dynamically sized according to selected roles */}
            <div className={`grid ${canTargetClass ? "grid-cols-3" : "grid-cols-2"} gap-2`}>
              <div
                onClick={() => setTargetScope("BROADCAST")}
                className={`cursor-pointer p-3 rounded-2xl border text-center transition-all ${
                  targetScope === "BROADCAST"
                    ? "border-[#5826df] bg-white dark:bg-zinc-900 text-[#5826df] font-bold ring-2 ring-[#5826df]/20 shadow-xs"
                    : "border-slate-200 dark:border-zinc-700 bg-white/60 dark:bg-zinc-800/40 text-slate-600 dark:text-zinc-400 font-medium hover:border-slate-300"
                }`}
              >
                <Users className="w-4 h-4 mx-auto mb-1 stroke-[2.2]" />
                <p className="text-xs">Broadcast Roles</p>
                <p className="text-[10px] text-slate-400 font-normal">All in Selected Roles</p>
              </div>

              {canTargetClass && (
                <div
                  onClick={() => setTargetScope("CLASS")}
                  className={`cursor-pointer p-3 rounded-2xl border text-center transition-all ${
                    targetScope === "CLASS"
                      ? "border-[#5826df] bg-white dark:bg-zinc-900 text-[#5826df] font-bold ring-2 ring-[#5826df]/20 shadow-xs"
                      : "border-slate-200 dark:border-zinc-700 bg-white/60 dark:bg-zinc-800/40 text-slate-600 dark:text-zinc-400 font-medium hover:border-slate-300"
                  }`}
                >
                  <School className="w-4 h-4 mx-auto mb-1 stroke-[2.2]" />
                  <p className="text-xs">Specific Class</p>
                  <p className="text-[10px] text-slate-400 font-normal">Class & Division</p>
                </div>
              )}

              <div
                onClick={() => {
                  setTargetScope("INDIVIDUAL");
                  if (!isAllRoles && selectedRoles.length === 1) {
                    setIndividualRole(selectedRoles[0]);
                  }
                }}
                className={`cursor-pointer p-3 rounded-2xl border text-center transition-all ${
                  targetScope === "INDIVIDUAL"
                    ? "border-[#5826df] bg-white dark:bg-zinc-900 text-[#5826df] font-bold ring-2 ring-[#5826df]/20 shadow-xs"
                    : "border-slate-200 dark:border-zinc-700 bg-white/60 dark:bg-zinc-800/40 text-slate-600 dark:text-zinc-400 font-medium hover:border-slate-300"
                }`}
              >
                <UserCheck className="w-4 h-4 mx-auto mb-1 stroke-[2.2]" />
                <p className="text-xs">Particular Person</p>
                <p className="text-[10px] text-slate-400 font-normal">Any Staff, Student, etc.</p>
              </div>
            </div>

            {/* When INDIVIDUAL: Role picker and interactive person search */}
            {targetScope === "INDIVIDUAL" && (
              <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-zinc-700">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-zinc-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-[#5826df]" />
                      1. Select Role of Recipient <span className="text-rose-500">*</span>
                    </span>
                    <span className="text-[10px] text-slate-400">Total {TARGET_ROLE_OPTIONS.length} Roles (Synced)</span>
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap p-1.5 bg-slate-100/90 dark:bg-zinc-800/80 rounded-2xl">
                    {TARGET_ROLE_OPTIONS.map((r) => {
                      const isSel = individualRole === r.value;
                      return (
                        <button
                          key={r.value}
                          type="button"
                          onClick={() => {
                            setIndividualRole(r.value);
                            setSelectedRecipient(null);
                            setSelectedRoles([r.value]);
                            setIsAllRoles(false);
                          }}
                          className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                            isSel
                              ? "bg-[#5826df] text-white shadow-xs"
                              : "bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:bg-slate-50"
                          }`}
                        >
                          {r.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Recipient Picker */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-[#5826df]" />
                      2. Choose Particular {TARGET_ROLE_OPTIONS.find((r) => r.value === individualRole)?.label || "User"} <span className="text-rose-500">*</span>
                    </label>
                    {selectedRecipient && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRecipient(null);
                          setParentStudentId(null);
                        }}
                        className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer"
                      >
                        Change Recipient
                      </button>
                    )}
                  </div>

                  {selectedRecipient ? (
                    <div className="p-3 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-[#5826df]/30 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#5826df] text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                          {(selectedRecipient.name || "U")[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-900 dark:text-zinc-100">
                            {selectedRecipient.name}
                          </p>
                          <p className="text-[10px] text-slate-500 font-medium">
                            {selectedRecipient.details || selectedRecipient.role}
                          </p>
                        </div>
                      </div>
                      <Badge className="bg-[#5826df] text-white text-[10px] font-bold rounded-lg px-2 py-0.5">
                        Selected
                      </Badge>
                    </div>
                  ) : individualRole === "PARENT" ? (
                    /* Guided Parent Picker: Class -> Division -> Student -> Parent */
                    <div className="space-y-2.5 p-3 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700">
                      <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-zinc-800">
                        <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                          <HeartHandshake className="w-4 h-4 text-[#5826df]" />
                          Step-by-Step Parent Selection:
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">Class &gt; Division &gt; Student &gt; Parent</span>
                      </div>

                      {/* Step 1: Class & Division */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                            1. Select Class
                          </label>
                          <select
                            value={parentClassId}
                            onChange={(e) => {
                              setParentClassId(e.target.value);
                              setParentDivision("ALL");
                              setParentStudentId(null);
                            }}
                            className="w-full h-8 px-2 text-xs rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 font-bold"
                          >
                            <option value="">-- Choose Class --</option>
                            {classes.map((c) => (
                              <option key={c.id} value={c.id}>{c.school_class}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                            2. Select Division
                          </label>
                          <select
                            value={parentDivision}
                            onChange={(e) => {
                              setParentDivision(e.target.value);
                              setParentStudentId(null);
                            }}
                            disabled={!parentClassId}
                            className="w-full h-8 px-2 text-xs rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 font-bold disabled:opacity-50"
                          >
                            <option value="ALL">All Divisions</option>
                            {parentAvailableDivisions.map((d) => (
                              <option key={d} value={d}>Division {d}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Step 2: Student List in that Class */}
                      {parentClassId ? (
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                            3. Select Student Ward:
                          </label>
                          {parentStudentsLoading ? (
                            <div className="py-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#5826df]" />
                              Loading students in class...
                            </div>
                          ) : parentStudentsList.length === 0 ? (
                            <div className="py-3 text-center text-xs text-slate-400">
                              No students found in this class/division.
                            </div>
                          ) : (
                            <div className="max-h-36 overflow-y-auto space-y-1 p-1 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950">
                              {parentStudentsList.map((st) => (
                                <div
                                  key={st.id}
                                  onClick={() => handleSelectParentForStudent(st)}
                                  className="p-1.5 px-2 rounded-lg hover:bg-indigo-50 dark:hover:bg-zinc-800 cursor-pointer flex items-center justify-between text-xs transition-colors"
                                >
                                  <div>
                                    <span className="font-bold text-slate-800 dark:text-zinc-200">{st.name}</span>
                                    <span className="text-[10px] text-slate-400 ml-2">Roll: {st.roll_no || "N/A"}</span>
                                  </div>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="h-5 text-[9px] px-2 font-bold hover:bg-[#5826df] hover:text-white shrink-0"
                                  >
                                    Select Parent
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : null}

                      {/* Fallback direct search for parent */}
                      <div className="pt-2 border-t border-slate-100 dark:border-zinc-800">
                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                          <Input
                            placeholder="Or directly search parent by mobile, father, or mother name..."
                            value={recipientSearch}
                            onChange={(e) => setRecipientSearch(e.target.value)}
                            className="pl-8 h-8 text-xs rounded-xl bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700"
                          />
                        </div>
                        {recipientSearch.trim() && (
                          <div className="max-h-32 overflow-y-auto mt-1 space-y-1 p-1 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
                            {recipientsLoading ? (
                              <div className="py-2 text-center text-xs text-slate-400">Searching...</div>
                            ) : recipientsList.length === 0 ? (
                              <div className="py-2 text-center text-xs text-slate-400">No matching parents found</div>
                            ) : (
                              recipientsList.map((rec) => (
                                <div
                                  key={`parent_search_${rec.id}`}
                                  onClick={() => setSelectedRecipient(rec)}
                                  className="p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-zinc-800 cursor-pointer text-xs flex justify-between items-center"
                                >
                                  <div>
                                    <p className="font-bold text-slate-800 dark:text-zinc-200">{rec.name}</p>
                                    <p className="text-[10px] text-slate-400">{rec.details}</p>
                                  </div>
                                  <Button type="button" size="sm" variant="outline" className="h-5 text-[9px] px-2 font-bold">
                                    Select
                                  </Button>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Standard search for other roles */
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <Input
                          placeholder={`Search ${individualRole.toLowerCase()} by name, phone, email, or username...`}
                          value={recipientSearch}
                          onChange={(e) => setRecipientSearch(e.target.value)}
                          className="pl-8 h-9 text-xs rounded-xl bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700"
                        />
                      </div>

                      <div className="max-h-44 overflow-y-auto space-y-1.5 p-1 rounded-2xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
                        {recipientsLoading ? (
                          <div className="py-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-[#5826df]" />
                            Loading {individualRole.toLowerCase()} list...
                          </div>
                        ) : recipientsList.length === 0 ? (
                          <div className="py-6 text-center text-xs text-slate-400">
                            No {individualRole.toLowerCase()} users found in this school matching your search.
                          </div>
                        ) : (
                          recipientsList.map((rec) => (
                            <div
                              key={`${rec.role}_${rec.id}`}
                              onClick={() => setSelectedRecipient(rec)}
                              className="p-2 rounded-xl hover:bg-indigo-50 dark:hover:bg-zinc-800 cursor-pointer flex items-center justify-between gap-2 transition-colors"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 flex items-center justify-center font-bold text-[10px] shrink-0">
                                  {(rec.name || "U")[0].toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-slate-800 dark:text-zinc-200 truncate">
                                    {rec.name}
                                  </p>
                                  <p className="text-[10px] text-slate-400 truncate">
                                    {rec.details || rec.role}
                                  </p>
                                </div>
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-6 text-[10px] rounded-lg px-2 font-bold hover:bg-[#5826df] hover:text-white shrink-0 cursor-pointer"
                              >
                                Select
                              </Button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* When CLASS: Class & Division selectors */}
            {targetScope === "CLASS" && (
              <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-zinc-700">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-zinc-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <School className="w-3.5 h-3.5 text-[#5826df]" />
                      Select Standard / Class <span className="text-rose-500">*</span>
                    </span>
                    {selectedClassId && (
                      <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                        Class Selected
                      </span>
                    )}
                  </label>
                  <select
                    value={selectedClassId}
                    onChange={(e) => {
                      setSelectedClassId(e.target.value);
                      setSelectedDivision("");
                    }}
                    className="w-full h-11 px-3.5 text-xs rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 font-bold text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#5826df]/25 focus:border-[#5826df]"
                  >
                    <option value="">-- Choose Standard / Class --</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.school_class}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                      <Filter className="w-3.5 h-3.5 text-[#5826df]" />
                      Division
                    </label>
                    {selectedClassId && (
                      <span className="text-[10px] text-slate-400 font-medium">
                        {availableDivisions.length > 0
                          ? `${availableDivisions.length} Division${availableDivisions.length > 1 ? "s" : ""} found`
                          : "No specific divisions registered"}
                      </span>
                    )}
                  </div>

                  {!selectedClassId ? (
                    <div className="p-3 rounded-2xl bg-slate-100/70 dark:bg-zinc-800/40 border border-dashed border-slate-200 dark:border-zinc-700 text-center text-xs text-slate-400">
                      Please select a Standard / Class above to see its divisions
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 flex-wrap p-1.5 bg-slate-100/90 dark:bg-zinc-800/80 rounded-2xl">
                      <button
                        type="button"
                        onClick={() => setSelectedDivision("")}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          !selectedDivision || selectedDivision === "ALL"
                            ? "bg-[#5826df] text-white shadow-xs"
                            : "bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:bg-slate-50"
                        }`}
                      >
                        All Divisions
                      </button>

                      {availableDivisions.map((divName) => {
                        const isSelected = selectedDivision.toUpperCase() === divName;
                        return (
                          <button
                            key={divName}
                            type="button"
                            onClick={() => setSelectedDivision(divName)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                              isSelected
                                ? "bg-[#5826df] text-white shadow-xs"
                                : "bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:bg-slate-50"
                            }`}
                          >
                            Div {divName}
                          </button>
                        );
                      })}

                      {availableDivisions.length === 0 && (
                        <>
                          {["A", "B", "C", "D"].map((divName) => {
                            const isSelected = selectedDivision.toUpperCase() === divName;
                            return (
                              <button
                                key={divName}
                                type="button"
                                onClick={() => setSelectedDivision(divName)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                  isSelected
                                    ? "bg-[#5826df] text-white shadow-xs"
                                    : "bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:bg-slate-50"
                                }`}
                              >
                                Div {divName}
                              </button>
                            );
                          })}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Expiry Date */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-700 dark:text-zinc-300 flex items-center justify-between">
              <span>Expiry Date & Time (Optional)</span>
              <span className="text-[10px] text-slate-400 font-normal">Auto-archives after this date</span>
            </label>
            <Input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="h-10 text-xs rounded-2xl bg-slate-50/80 dark:bg-zinc-800/60 border-slate-200 dark:border-zinc-700 font-medium focus-visible:border-[#5826df] focus-visible:ring-2 focus-visible:ring-[#5826df]/20"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-700 dark:text-zinc-300 flex items-center justify-between">
              <span>Announcement Message / Circular Text <span className="text-rose-500">*</span></span>
              <span className="text-[10px] text-slate-400 font-normal">{description.length} chars</span>
            </label>
            <Textarea
              placeholder="Write the full circular, homework schedule, or student instructions here..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="text-xs rounded-2xl bg-slate-50/80 dark:bg-zinc-800/60 border-slate-200 dark:border-zinc-700 font-medium leading-relaxed focus-visible:border-[#5826df] focus-visible:ring-2 focus-visible:ring-[#5826df]/20"
              required
            />
          </div>

          {/* Live Dynamic Preview Card */}
          <div className="p-4 rounded-3xl bg-indigo-50/40 dark:bg-zinc-800/40 border border-indigo-100 dark:border-zinc-800 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#5826df] dark:text-indigo-400 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" /> Live Circular Preview
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              {getPriorityBadge(priority)}
              {getAudienceBadge(isAllRoles ? "ALL" : selectedRoles.join(","), isAllRoles)}
              {targetScope === "INDIVIDUAL" && selectedRecipient && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold">
                  <UserCheck className="w-3 h-3" />
                  Direct: {selectedRecipient.name} ({selectedRecipient.role})
                </span>
              )}
              {targetScope === "CLASS" && selectedClassId && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 text-[11px] font-bold">
                  <School className="w-3 h-3" />
                  Class #{selectedClassId} {selectedDivision ? `(Div ${selectedDivision})` : ""}
                </span>
              )}
            </div>
            <p className="text-xs font-black text-slate-800 dark:text-zinc-200 truncate first-letter:uppercase">
              {capitalizeFirstLetter(title) || "Notice Title will appear here..."}
            </p>
            <p className="text-[11px] text-slate-600 dark:text-zinc-400 line-clamp-2 leading-relaxed first-letter:uppercase">
              {capitalizeFirstLetter(description) || "Circular content and details will appear here..."}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-zinc-800">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
              className="rounded-2xl h-10 text-xs font-bold px-4 border-slate-200 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-gradient-to-r from-[#5826df] to-[#6d3df5] hover:from-[#4c1fc7] hover:to-[#5e2de0] text-white rounded-2xl h-10 text-xs font-bold px-6 gap-2 shadow-md shadow-[#5826df]/25 transition-all cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  {isEdit ? "Update Announcement" : "Broadcast Announcement"}
                </>
              )}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ─── ANNOUNCEMENT DETAIL MODAL (FULL SCREEN VIEW) ─────────────────────────────
function AnnouncementDetailModal({
  announcement,
  onClose,
}: {
  announcement: AnnouncementResponse;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-[95vw] sm:max-w-xl p-4 sm:p-7 max-h-[88vh] overflow-y-auto z-10 border border-slate-200 dark:border-zinc-800 space-y-4"
      >
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-zinc-800">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              {getPriorityBadge(announcement.priority)}
              {getAudienceBadge(announcement.announcement_for, announcement.is_everyone)}
              {getTargetScopeBadge(announcement)}
            </div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-zinc-100 leading-snug first-letter:uppercase">
              {capitalizeFirstLetter(announcement.title)}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-zinc-800 shrink-0 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Sender & Date Info */}
        <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50/80 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-800 text-xs">
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Posted By</p>
            <p className="font-bold text-slate-800 dark:text-zinc-200 mt-0.5 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#5826df]" />
              {announcement.is_created_by_me || (announcement.created_by_name || "").toLowerCase() === "created by me"
                ? "Created by me"
                : (announcement.created_by_name || announcement.created_by_role || "School Administration")}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Date & Time</p>
            <p className="font-mono text-[11px] text-slate-600 dark:text-zinc-400 mt-0.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              {formatDateDisplay(announcement.created_at)}
            </p>
          </div>
        </div>

        {/* Full Text Content */}
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Circular Details</p>
          <div className="p-4 rounded-2xl bg-slate-50/40 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800">
            <p className="text-xs sm:text-sm text-slate-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed font-normal">
              {announcement.description}
            </p>
          </div>
        </div>

        {announcement.expires_at && (
          <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-semibold p-3 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60">
            <Clock className="w-4 h-4 text-amber-600" />
            <span>Notice valid until: {formatDateDisplay(announcement.expires_at)}</span>
          </div>
        )}

        {/* Modal Footer with Theme-Matched Button */}
        <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-zinc-800">
          <Button
            onClick={onClose}
            className="rounded-2xl h-10 px-6 text-xs font-bold bg-gradient-to-r from-[#5826df] to-[#6d3df5] hover:from-[#4c1fc7] hover:to-[#5e2de0] text-white shadow-md shadow-[#5826df]/25 transition-all active:scale-[0.98]"
          >
            Close Notice
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
