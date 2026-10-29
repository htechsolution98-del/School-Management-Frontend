"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  Edit3,
  Loader2,
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Palmtree,
  Trophy,
  BookOpen,
  Users2,
  PartyPopper,
  Clock,
  MapPin,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Filter,
  RefreshCw,
  Eye,
  CalendarDays,
  ListTodo,
  Info,
  ArrowLeft,
  Check,
  ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  getSchoolEvents,
  createSchoolEvent,
  updateSchoolEvent,
  deleteSchoolEvent,
  seedDefaultSchoolHolidays,
  getStoredSchoolEvents,
  type SchoolEventResponse,
  type SchoolEventPayload,
} from "@/lib/events";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MobileBottomDrawer } from "@/components/ui/mobile-bottom-drawer";

export interface EventsCalendarHubProps {
  roleTitle: string;
  canManage?: boolean;
  pageTitle?: string;
  pageSubtitle?: string;
}

const EVENT_TYPES = [
  {
    value: "HOLIDAY",
    label: "Holiday",
    desc: "School closed / Public holiday",
    icon: Palmtree,
    color: "#f59e0b",
    bgClass: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200",
  },
  {
    value: "EVENT",
    label: "School Event",
    desc: "Functions, sports, cultural events",
    icon: Trophy,
    color: "#2563EB",
    bgClass: "bg-blue-50 text-[#2563EB] dark:bg-blue-950/60 dark:text-blue-300 border-blue-200",
  },
  {
    value: "EXAM",
    label: "Exam / Assessment",
    desc: "Unit tests, semester exams, practicals",
    icon: BookOpen,
    color: "#e11d48",
    bgClass: "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200",
  },
  {
    value: "MEETING",
    label: "Meeting / PTM",
    desc: "Parent-teacher meetings & conferences",
    icon: Users2,
    color: "#059669",
    bgClass: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200",
  },
  {
    value: "CELEBRATION",
    label: "Celebration",
    desc: "National days, festivals, ceremonies",
    icon: PartyPopper,
    color: "#0284c7",
    bgClass: "bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200",
  },
  {
    value: "OTHER",
    label: "Other Activity",
    desc: "Workshops, camps, general notices",
    icon: CalendarDays,
    color: "#64748b",
    bgClass: "bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300 border-slate-200",
  },
];

export const EVENT_FILTER_OPTIONS = [
  { value: "ALL", label: "All Events & Holidays", icon: CalendarDays, color: "#2563EB" },
  { value: "HOLIDAY", label: "Holidays Only", icon: Palmtree, color: "#f59e0b" },
  { value: "EVENT", label: "School Events", icon: Trophy, color: "#2563EB" },
  { value: "EXAM", label: "Exams & Tests", icon: BookOpen, color: "#e11d48" },
  { value: "MEETING", label: "Meetings / PTM", icon: Users2, color: "#059669" },
  { value: "CELEBRATION", label: "Celebrations", icon: PartyPopper, color: "#0284c7" },
];

export const AUDIENCE_OPTIONS = [
  { value: "ALL", label: "Everyone (All Roles)", desc: "School-wide broadcast to all panels", icon: Users2 },
  { value: "STUDENTS_PARENTS", label: "Students & Parents", desc: "Visible to students and their guardians", icon: BookOpen },
  { value: "STUDENT", label: "Students Only", desc: "Visible exclusively on student portal", icon: Sparkles },
  { value: "PARENT", label: "Parents Only", desc: "Visible exclusively on parent portal", icon: Users2 },
  { value: "TEACHER", label: "Teachers Only", desc: "Academic staff notices & circulars", icon: BookOpen },
  { value: "STAFF", label: "Staff & Administration", desc: "Non-academic staff & office circulars", icon: ShieldCheck },
];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAYS_OF_WEEK_SHORT = ["S", "M", "T", "W", "T", "F", "S"];

function capitalizeFirstLetter(str?: string) {
  if (!str) return "";
  const trimmed = str.trim();
  if (!trimmed) return "";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function getEventTypeConfig(typeStr?: string) {
  const t = (typeStr || "EVENT").toUpperCase();
  const match = EVENT_TYPES.find((e) => e.value === t);
  return match || EVENT_TYPES[1];
}

/**
 * Normalizes any date format (DD-MM-YYYY, YYYY-MM-DD, ISO string) into standard YYYY-MM-DD
 */
function toISODateString(rawDate?: string | null): string {
  if (!rawDate) return "";
  const trimmed = String(rawDate).trim();
  if (!trimmed) return "";

  // If already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // If DD-MM-YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
    const [d, m, y] = trimmed.split("-");
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // If DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    const [d, m, y] = trimmed.split("/");
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // If ISO datetime string like 2026-10-10T12:00:00
  if (trimmed.includes("T")) {
    return trimmed.split("T")[0];
  }

  try {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    }
  } catch {}

  return trimmed;
}

function formatDateDisplay(dateStr?: string | null) {
  if (!dateStr) return "N/A";
  const iso = toISODateString(dateStr);
  try {
    const [y, m, d] = iso.split("-").map(Number);
    if (!y || !m || !d) return dateStr;
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function EventsCalendarHub({
  roleTitle,
  canManage = false,
  pageTitle,
  pageSubtitle,
}: EventsCalendarHubProps) {
  const today = useMemo(() => new Date(), []);
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth()); // 0-indexed

  const [events, setEvents] = useState<SchoolEventResponse[]>(() => getStoredSchoolEvents());
  const [loading, setLoading] = useState(() => getStoredSchoolEvents().length === 0);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("ALL");
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"CALENDAR" | "AGENDA">("CALENDAR");

  // Selected date for day drawer/modal
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);

  // Modals state
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<SchoolEventResponse | null>(null);
  const [initialDateForForm, setInitialDateForForm] = useState<string>("");
  const [deleteConfirmEvent, setDeleteConfirmEvent] = useState<SchoolEventResponse | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [viewingDetailEvent, setViewingDetailEvent] = useState<SchoolEventResponse | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);

  const handleSeedDefaults = async () => {
    setIsSeeding(true);
    try {
      const res = await seedDefaultSchoolHolidays();
      toast.success(res.message || "Public holidays synced successfully!");
      if (res.events && res.events.length > 0) {
        setEvents(res.events);
      } else {
        await fetchEventsList(true);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to sync public holidays.");
    } finally {
      setIsSeeding(false);
    }
  };

  const fetchEventsList = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await getSchoolEvents({ year: currentYear });
      setEvents(data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load events.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentYear]);

  useEffect(() => {
    fetchEventsList();
  }, [fetchEventsList]);

  // Calendar Navigation
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleGoToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
  };

  // Derived filter
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      if (selectedTypeFilter === "ALL") return true;
      if (selectedTypeFilter === "HOLIDAY" || selectedTypeFilter === "HOLIDAY_ONLY") {
        return ev.is_holiday || (ev.event_type || "").toUpperCase() === "HOLIDAY";
      }
      const evType = (ev.event_type || "EVENT").toUpperCase();
      if (selectedTypeFilter === "EVENT") {
        return evType === "EVENT" || evType === "CELEBRATION";
      }
      return evType === selectedTypeFilter;
    });
  }, [events, selectedTypeFilter]);

  // Month Events (filtered by selectedTypeFilter and overlapping currentMonth)
  const monthEvents = useMemo(() => {
    const padM = String(currentMonth + 1).padStart(2, "0");
    const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
    const monthStart = `${currentYear}-${padM}-01`;
    const monthEnd = `${currentYear}-${padM}-${String(lastDay).padStart(2, "0")}`;

    return filteredEvents
      .filter((ev) => {
        const startIso = toISODateString(ev.start_date);
        const endIso = toISODateString(ev.end_date) || startIso;
        if (!startIso) return false;
        return startIso <= monthEnd && endIso >= monthStart;
      })
      .sort((a, b) => {
        const aDate = toISODateString(a.start_date) || "";
        const bDate = toISODateString(b.start_date) || "";
        return aDate.localeCompare(bDate);
      });
  }, [filteredEvents, currentYear, currentMonth]);

  // All events in month (unfiltered for accurate stat counters)
  const allMonthEvents = useMemo(() => {
    const padM = String(currentMonth + 1).padStart(2, "0");
    const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
    const monthStart = `${currentYear}-${padM}-01`;
    const monthEnd = `${currentYear}-${padM}-${String(lastDay).padStart(2, "0")}`;

    return events.filter((ev) => {
      const startIso = toISODateString(ev.start_date);
      const endIso = toISODateString(ev.end_date) || startIso;
      if (!startIso) return false;
      return startIso <= monthEnd && endIso >= monthStart;
    });
  }, [events, currentYear, currentMonth]);

  const holidaysCount = allMonthEvents.filter((e) => e.is_holiday || e.event_type === "HOLIDAY").length;
  const schoolEventsCount = allMonthEvents.filter((e) => e.event_type === "EVENT" || e.event_type === "CELEBRATION").length;
  const examsCount = allMonthEvents.filter((e) => e.event_type === "EXAM").length;
  const meetingsCount = allMonthEvents.filter((e) => e.event_type === "MEETING").length;

  // Calendar Grid Cells Computation
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun
    const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();

    const days = [];

    // Prev month padding days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthDays - i;
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const padM = String(prevMonth + 1).padStart(2, "0");
      const padD = String(dayNum).padStart(2, "0");
      const dateStr = `${prevYear}-${padM}-${padD}`;
      days.push({
        dayNum,
        dateStr,
        isCurrentMonth: false,
        isToday: false,
        events: [] as SchoolEventResponse[],
      });
    }

    // Current month days
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const padM = String(currentMonth + 1).padStart(2, "0");
      const padD = String(d).padStart(2, "0");
      const dateStr = `${currentYear}-${padM}-${padD}`;

      const isToday =
        today.getFullYear() === currentYear &&
        today.getMonth() === currentMonth &&
        today.getDate() === d;

      // Match events occurring on this date (start_date to end_date range or start_date exact)
      const dayEvs = filteredEvents.filter((ev) => {
        const startIso = toISODateString(ev.start_date);
        const endIso = toISODateString(ev.end_date) || startIso;
        if (!startIso) return false;
        if (startIso === dateStr) return true;
        if (endIso && endIso >= startIso) {
          return dateStr >= startIso && dateStr <= endIso;
        }
        return false;
      });

      days.push({
        dayNum: d,
        dateStr,
        isCurrentMonth: true,
        isToday,
        events: dayEvs,
      });
    }

    // Next month padding days to complete grid (up to multiple of 7)
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
      const padM = String(nextMonth + 1).padStart(2, "0");
      const padD = String(i).padStart(2, "0");
      const dateStr = `${nextYear}-${padM}-${padD}`;
      days.push({
        dayNum: i,
        dateStr,
        isCurrentMonth: false,
        isToday: false,
        events: [] as SchoolEventResponse[],
      });
    }

    return days;
  }, [currentYear, currentMonth, filteredEvents, today]);

  // Events for selected date
  const selectedDateEvents = useMemo(() => {
    if (!selectedDateStr) return [];
    return filteredEvents
      .filter((ev) => {
        const startIso = toISODateString(ev.start_date);
        const endIso = toISODateString(ev.end_date) || startIso;
        if (!startIso) return false;
        if (startIso === selectedDateStr) return true;
        if (endIso && endIso >= startIso) {
          return selectedDateStr >= startIso && selectedDateStr <= endIso;
        }
        return false;
      })
      .sort((a, b) => {
        const aDate = toISODateString(a.start_date) || "";
        const bDate = toISODateString(b.start_date) || "";
        return aDate.localeCompare(bDate);
      });
  }, [filteredEvents, selectedDateStr]);

  // Events displayed below the calendar (filtered by date if clicked, or showing month's holidays & events)
  const displayedEventsList = useMemo(() => {
    if (selectedDateStr) {
      return selectedDateEvents;
    }
    return monthEvents;
  }, [selectedDateStr, selectedDateEvents, monthEvents]);

  // Delete Handler
  const handleDeleteConfirm = async () => {
    if (!deleteConfirmEvent) return;
    setDeleting(true);
    try {
      await deleteSchoolEvent(deleteConfirmEvent.id);
      setEvents((prev) => prev.filter((e) => e.id !== deleteConfirmEvent.id));
      toast.success("Event removed successfully.");
      setDeleteConfirmEvent(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete event.");
    } finally {
      setDeleting(false);
    }
  };

  const defaultTitle = `${roleTitle} Events & Holiday Calendar`;
  const defaultSubtitle = canManage
    ? "Create, schedule, and broadcast official school events, holidays, examinations, and meetings."
    : "Stay updated with official school academic calendars, public holidays, exams, and celebrations.";

  return (
    <div className="space-y-3 sm:space-y-4 max-w-7xl mx-auto px-0 sm:px-2 lg:px-4 py-1 sm:py-4 pb-3 sm:pb-5 lg:pb-8 w-full min-w-0 overflow-x-hidden font-sans">
      {/* ─── TOP HEADER CARD (HERO BANNER) ─────────────────────────────────── */}
      <div className="relative overflow-hidden bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200/80 dark:border-zinc-800 shadow-[0_4px_25px_rgba(37,99,235,0.05)] p-4 sm:p-6 lg:p-7 w-full min-w-0">
        {/* Soft background blue glow behind right 3D illustration */}
        <div className="absolute right-0 top-0 bottom-0 w-3/5 bg-gradient-to-l from-blue-100/50 via-blue-50/20 to-transparent dark:from-blue-950/20 dark:via-zinc-900/10 pointer-events-none rounded-r-3xl" />
        <div className="absolute -right-6 -bottom-6 w-48 h-48 bg-blue-200/30 dark:bg-blue-900/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-2.5 sm:gap-4">
          {/* Header Row: Icon + Title in a SINGLE LINE across full width */}
          <div className="flex items-center gap-2.5 sm:gap-3 w-full min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-[#2563EB]/15 to-[#1D4ED8]/25 text-[#2563EB] border border-[#2563EB]/20 flex items-center justify-center shrink-0 shadow-2xs">
              <CalendarIcon className="h-5 w-5 sm:h-6 sm:w-6 stroke-[2.2]" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-base sm:text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-zinc-100 tracking-tight leading-tight truncate sm:whitespace-normal">
                {pageTitle || defaultTitle}
              </h1>
            </div>
          </div>

          {/* Content Row: Bottom Paragraph on Left, 3D Image on Right */}
          <div className="flex items-center justify-between gap-3 sm:gap-6 w-full min-w-0">
            <div className="flex-1 min-w-0 pr-1">
              <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 max-w-[280px] sm:max-w-md lg:max-w-xl leading-relaxed font-normal">
                {pageSubtitle || defaultSubtitle}
              </p>

              {/* Desktop Buttons Row (hidden on mobile, shown on sm+) */}
              <div className="hidden sm:flex items-center gap-2.5 sm:gap-3 mt-4 flex-nowrap">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => fetchEventsList(true)}
                  disabled={refreshing}
                  className="h-10 w-10 rounded-2xl text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:border-[#2563EB]/30 hover:bg-blue-50/40 hover:text-[#2563EB] transition-all shadow-2xs justify-center shrink-0 cursor-pointer"
                  title="Refresh events"
                  aria-label="Refresh events"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin text-[#2563EB]" : ""}`} />
                </Button>

                {canManage && (
                  <>
                    <Button
                      variant="outline"
                      onClick={handleSeedDefaults}
                      disabled={isSeeding || refreshing}
                      title="Automatically load and synchronize standard public and school holidays"
                      className="h-10 rounded-2xl px-4 text-xs font-bold text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/60 bg-amber-50/60 hover:bg-amber-100 dark:hover:bg-amber-950/40 gap-2 transition-all shadow-2xs justify-center cursor-pointer whitespace-nowrap"
                    >
                      <Sparkles className={`h-4 w-4 ${isSeeding ? "animate-spin text-amber-500" : "text-amber-500"}`} />
                      {isSeeding ? "Syncing..." : "Sync Holidays"}
                    </Button>

                    <Button
                      onClick={() => {
                        setEditingEvent(null);
                        setInitialDateForForm("");
                        setFormModalOpen(true);
                      }}
                      className="h-10 bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] hover:from-[#1E40AF] hover:to-[#1D4ED8] text-white font-bold text-sm rounded-2xl px-5 gap-2 shadow-md shadow-[#2563EB]/25 transition-all hover:shadow-[#2563EB]/35 active:scale-[0.98] justify-center cursor-pointer whitespace-nowrap"
                    >
                      <Plus className="h-4 w-4 stroke-[2.5]" />
                      Add Event / Holiday
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Right 3D Books with Calendar Illustration */}
            <div className="shrink-0 flex items-center justify-end relative">
              <img
                src="/images/Books-with-calendar.png"
                alt="Events & Calendar"
                className="w-24 sm:w-40 md:w-48 lg:w-56 h-auto object-contain select-none pointer-events-none drop-shadow-md"
              />
            </div>
          </div>

          {/* Mobile Buttons Row (shown on mobile, hidden on sm+) - Guaranteed Single Line */}
          <div className="flex sm:hidden items-center gap-2 w-full mt-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => fetchEventsList(true)}
              disabled={refreshing}
              className="h-10 w-10 rounded-2xl text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:border-[#2563EB]/30 hover:bg-blue-50/40 hover:text-[#2563EB] transition-all shadow-2xs justify-center shrink-0 cursor-pointer"
              title="Refresh events"
              aria-label="Refresh events"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin text-[#2563EB]" : ""}`} />
            </Button>

            {canManage && (
              <>
                <Button
                  variant="outline"
                  onClick={handleSeedDefaults}
                  disabled={isSeeding || refreshing}
                  title="Sync public holidays"
                  className="flex-1 h-10 rounded-2xl px-2 text-xs font-bold text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/60 bg-amber-50/60 hover:bg-amber-100 gap-1.5 transition-all shadow-2xs justify-center cursor-pointer truncate"
                >
                  <Sparkles className={`h-3.5 w-3.5 shrink-0 ${isSeeding ? "animate-spin text-amber-500" : "text-amber-500"}`} />
                  <span className="truncate">{isSeeding ? "Syncing..." : "Sync Holidays"}</span>
                </Button>

                <Button
                  onClick={() => {
                    setEditingEvent(null);
                    setInitialDateForForm("");
                    setFormModalOpen(true);
                  }}
                  className="flex-1 h-10 bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] hover:from-[#1E40AF] text-white font-bold text-xs rounded-2xl px-2.5 gap-1.5 shadow-md shadow-[#2563EB]/25 transition-all active:scale-[0.98] justify-center cursor-pointer truncate"
                >
                  <Plus className="h-3.5 w-3.5 stroke-[2.5] shrink-0" />
                  <span className="truncate">Add Event</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ─── STAT CARDS ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3.5">
        <Card className="rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
          <CardContent className="p-2.5 sm:p-5 flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-100 dark:border-amber-900/60 flex items-center justify-center text-amber-600 shrink-0 shadow-2xs">
              <Palmtree className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">Holidays ({MONTH_NAMES[currentMonth].slice(0, 3)})</p>
              <p className="text-lg sm:text-2xl font-black text-amber-600 dark:text-amber-400">{holidaysCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
          <CardContent className="p-2.5 sm:p-5 flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/60 flex items-center justify-center text-[#2563EB] shrink-0 shadow-2xs">
              <Trophy className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">Events & Fests</p>
              <p className="text-lg sm:text-2xl font-black text-[#2563EB] dark:text-blue-400">{schoolEventsCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
          <CardContent className="p-2.5 sm:p-5 flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-100 dark:border-rose-900/60 flex items-center justify-center text-rose-600 shrink-0 shadow-2xs">
              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">Exams & Tests</p>
              <p className="text-lg sm:text-2xl font-black text-rose-600 dark:text-rose-400">{examsCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
          <CardContent className="p-2.5 sm:p-5 flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-900/60 flex items-center justify-center text-emerald-600 shrink-0 shadow-2xs">
              <Users2 className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">Meetings & PTM</p>
              <p className="text-lg sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">{meetingsCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── CALENDAR CONTROLS & FILTER PILLS ────────────────────────────── */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-zinc-800 p-3 sm:p-5 space-y-2.5 sm:space-y-3.5 shadow-2xs w-full min-w-0 overflow-hidden">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3">
          {/* Month / Year Navigator */}
          <div className="flex items-center gap-1.5 sm:gap-2 justify-between sm:justify-start">
            <div className="flex items-center gap-1">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 sm:p-2 rounded-xl sm:rounded-2xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-700 dark:text-zinc-300 transition-colors"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              <div className="flex items-center gap-1.5 px-3 py-1 sm:px-3.5 sm:py-1.5 bg-slate-50 dark:bg-zinc-800/60 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-zinc-700">
                <h2 className="text-xs sm:text-base font-black text-slate-900 dark:text-zinc-100 tracking-tight">
                  {MONTH_NAMES[currentMonth]} {currentYear}
                </h2>
              </div>

              <button
                onClick={handleNextMonth}
                className="p-1.5 sm:p-2 rounded-xl sm:rounded-2xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-700 dark:text-zinc-300 transition-colors"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            <button
              onClick={handleGoToday}
              className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs font-bold bg-blue-50 dark:bg-blue-950/50 text-[#2563EB] hover:bg-blue-100 border border-[#2563EB]/20 transition-all shadow-2xs"
            >
              Today
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 p-0.5 sm:p-1 bg-slate-100 dark:bg-zinc-800 rounded-xl sm:rounded-2xl self-end sm:self-auto">
            <button
              onClick={() => setViewMode("CALENDAR")}
              className={`px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1 sm:gap-1.5 ${
                viewMode === "CALENDAR"
                  ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-xs"
                  : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
              }`}
            >
              <CalendarDays className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              Month Grid
            </button>
            <button
              onClick={() => setViewMode("AGENDA")}
              className={`px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1 sm:gap-1.5 ${
                viewMode === "AGENDA"
                  ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-xs"
                  : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
              }`}
            >
              <ListTodo className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              Agenda List
            </button>
          </div>
        </div>

        {/* Mobile Filter Drawer Trigger (Mobile Only) */}
        <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 flex sm:hidden items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setFilterDrawerOpen(true)}
            className="flex-1 h-10 px-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 flex items-center justify-between gap-2 text-xs font-bold text-slate-800 dark:text-zinc-200 active:scale-[0.99] transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Filter className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
              <span className="text-slate-400 font-semibold text-[11px]">Filter:</span>
              <span className="text-[#2563EB] truncate">
                {EVENT_FILTER_OPTIONS.find((o) => o.value === selectedTypeFilter)?.label || "All Events"}
              </span>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
          </button>
        </div>

        {/* Mobile Bottom Drawer for Calendar Category Filter */}
        <MobileBottomDrawer
          isOpen={filterDrawerOpen}
          onClose={() => setFilterDrawerOpen(false)}
          title="Filter Calendar Events"
          subtitle="Select category of events to display"
        >
          <div className="space-y-2 py-1">
            {EVENT_FILTER_OPTIONS.map((opt) => {
              const isSelected = selectedTypeFilter === opt.value;
              const Icon = opt.icon;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setSelectedTypeFilter(opt.value);
                    setFilterDrawerOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all text-left cursor-pointer ${
                    isSelected
                      ? "border-[#2563EB] bg-blue-50/70 dark:bg-blue-950/40 text-[#2563EB] font-black shadow-xs ring-1 ring-[#2563EB]"
                      : "border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 font-semibold hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: isSelected ? "#2563EB15" : "#64748b15",
                        color: isSelected ? "#2563EB" : opt.color || "#64748b",
                      }}
                    >
                      <Icon className="w-4 h-4 stroke-[2.2]" />
                    </div>
                    <span className="text-xs sm:text-sm">{opt.label}</span>
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-[#2563EB] text-white flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </MobileBottomDrawer>

        {/* Desktop Filter Pills Bar (Hidden on Mobile, Visible on Desktop) */}
        <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 hidden sm:flex items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pb-1 text-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1 mr-1">
            <Filter className="w-3 h-3 text-[#2563EB]" /> Filter:
          </span>

          <button
            onClick={() => setSelectedTypeFilter("ALL")}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              selectedTypeFilter === "ALL"
                ? "bg-[#2563EB] text-white shadow-xs"
                : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200"
            }`}
          >
            All Events & Holidays
          </button>

          <button
            onClick={() => setSelectedTypeFilter("HOLIDAY")}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
              selectedTypeFilter === "HOLIDAY"
                ? "bg-amber-500 text-white shadow-xs"
                : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200"
            }`}
          >
            <Palmtree className="w-3.5 h-3.5" />
            Holidays Only
          </button>

          <button
            onClick={() => setSelectedTypeFilter("EVENT")}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
              selectedTypeFilter === "EVENT"
                ? "bg-[#2563EB] text-white shadow-xs"
                : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200"
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            School Events
          </button>

          <button
            onClick={() => setSelectedTypeFilter("EXAM")}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
              selectedTypeFilter === "EXAM"
                ? "bg-rose-500 text-white shadow-xs"
                : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Exams & Tests
          </button>

          <button
            onClick={() => setSelectedTypeFilter("MEETING")}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
              selectedTypeFilter === "MEETING"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200"
            }`}
          >
            <Users2 className="w-3.5 h-3.5" />
            Meetings / PTM
          </button>

          <button
            onClick={() => setSelectedTypeFilter("CELEBRATION")}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
              selectedTypeFilter === "CELEBRATION"
                ? "bg-sky-600 text-white shadow-xs"
                : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200"
            }`}
          >
            <PartyPopper className="w-3.5 h-3.5" />
            Celebrations
          </button>
        </div>
      </div>

      {/* ─── MAIN CALENDAR / AGENDA VIEW ─────────────────────────────────── */}
      {loading ? (
        <div className="py-24 text-center flex flex-col items-center justify-center gap-3 bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200/80 dark:border-zinc-800 shadow-2xs">
          <Loader2 className="w-8 h-8 text-[#2563EB] animate-spin" />
          <p className="text-xs font-bold text-slate-500">Loading academic calendar...</p>
        </div>
      ) : viewMode === "CALENDAR" ? (
        <div className="space-y-3 sm:space-y-4">
          {/* ─── MONTH GRID VIEW (RESPONSIVE NO HORIZONTAL CUTOFF) ───────────── */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-zinc-800 overflow-hidden shadow-2xs w-full">
            {/* Days Header */}
            <div className="grid grid-cols-7 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-800/50 text-center text-[10px] sm:text-xs font-black text-slate-600 dark:text-zinc-400 py-1.5 sm:py-3">
              {DAYS_OF_WEEK.map((d, i) => (
                <div key={d} className={i === 0 ? "text-rose-500 font-extrabold" : ""}>
                  <span className="hidden sm:inline">{d}</span>
                  <span className="inline sm:hidden">{DAYS_OF_WEEK_SHORT[i]}</span>
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 dark:divide-zinc-800/80">
              {calendarDays.map((day, idx) => {
                const isSunday = idx % 7 === 0;
                const hasEvents = day.events.length > 0;
                const isSelected = selectedDateStr === day.dateStr;
                return (
                  <div
                    key={`${day.dateStr}-${idx}`}
                    onClick={() => {
                      if (day.isCurrentMonth) {
                        setSelectedDateStr((prev) => (prev === day.dateStr ? null : day.dateStr));
                      }
                    }}
                    className={`min-h-[46px] sm:min-h-[110px] p-1 sm:p-2 flex flex-col justify-between transition-all cursor-pointer group ${
                      !day.isCurrentMonth
                        ? "bg-slate-50/40 dark:bg-zinc-950/40 text-slate-300 dark:text-zinc-600 cursor-default"
                        : isSelected
                        ? "ring-2 ring-inset ring-[#2563EB] bg-blue-50/70 dark:bg-blue-950/40"
                        : isSunday
                        ? "bg-rose-50/20 dark:bg-rose-950/10 hover:bg-slate-50 dark:hover:bg-zinc-800/50"
                        : "hover:bg-slate-50 dark:hover:bg-zinc-800/50"
                    }`}
                  >
                  {/* Day Header */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[11px] sm:text-xs font-black w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center transition-all ${
                        day.isToday
                          ? "bg-[#2563EB] text-white shadow-xs"
                          : isSelected
                          ? "bg-[#2563EB]/20 text-[#2563EB] font-black"
                          : day.isCurrentMonth
                          ? isSunday
                            ? "text-rose-500 font-bold"
                            : "text-slate-800 dark:text-zinc-200"
                          : "text-slate-300 dark:text-zinc-600"
                      }`}
                    >
                      {day.dayNum}
                    </span>

                    {hasEvents && day.isCurrentMonth && (
                      <span className="text-[8px] sm:text-[10px] font-extrabold px-1 sm:px-1.5 py-0.2 rounded-full bg-slate-200/80 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
                        {day.events.length}
                      </span>
                    )}
                  </div>

                  {/* Event Badges List in Cell */}
                  {hasEvents && day.isCurrentMonth && (
                    <div className="space-y-0.5 sm:space-y-1 my-0.5 sm:my-1 overflow-hidden">
                      {/* Mobile Compact Dots */}
                      <div className="flex sm:hidden items-center justify-center gap-0.5 flex-wrap">
                        {day.events.slice(0, 3).map((ev) => {
                          const cfg = getEventTypeConfig(ev.event_type);
                          return (
                            <span
                              key={ev.id}
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: cfg.color }}
                              title={`${ev.title || ev.name} (${cfg.label})`}
                            />
                          );
                        })}
                        {day.events.length > 3 && (
                          <span className="text-[7px] font-black text-[#2563EB] leading-none">
                            +
                          </span>
                        )}
                      </div>

                      {/* Tablet / Desktop Full Badges */}
                      <div className="hidden sm:block space-y-1">
                        {day.events.slice(0, 2).map((ev) => {
                          const cfg = getEventTypeConfig(ev.event_type);
                          return (
                            <div
                              key={ev.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setViewingDetailEvent(ev);
                              }}
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-lg truncate border flex items-center gap-1 transition-transform hover:scale-[1.02] ${cfg.bgClass}`}
                              title={`${ev.title || ev.name} (${cfg.label})`}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{ backgroundColor: cfg.color }}
                              />
                              <span className="truncate">{capitalizeFirstLetter(ev.title || ev.name)}</span>
                            </div>
                          );
                        })}

                        {day.events.length > 2 && (
                          <p className="text-[9px] font-black text-[#2563EB] dark:text-blue-400 pl-1">
                            +{day.events.length - 2} more
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Cell Bottom Quick Action for Manager */}
                  {canManage && day.isCurrentMonth && (
                    <div className="hidden sm:flex opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingEvent(null);
                          setInitialDateForForm(day.dateStr);
                          setFormModalOpen(true);
                        }}
                        className="text-[10px] font-bold text-[#2563EB] hover:underline flex items-center gap-0.5"
                      >
                        <Plus className="w-3 h-3" /> Add
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── MONTH HOLIDAYS & CELEBRATIONS SECTION (BOTTOM OF CALENDAR) ─── */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-zinc-800 p-3 sm:p-6 shadow-2xs space-y-3 sm:space-y-4 w-full min-w-0 overflow-hidden">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-3 pb-2.5 sm:pb-3 border-b border-slate-100 dark:border-zinc-800 w-full min-w-0">
            <div className="flex items-center gap-2.5 sm:gap-3 w-full min-w-0">
              <div
                className={`p-2 sm:p-2.5 rounded-xl sm:rounded-2xl shrink-0 ${
                  selectedDateStr
                    ? "bg-blue-50 text-[#2563EB] border border-blue-100 dark:bg-blue-950/40 dark:border-blue-900"
                    : "bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-900"
                }`}
              >
                {selectedDateStr ? <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5" /> : <Palmtree className="w-4 h-4 sm:w-5 sm:h-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-lg font-black text-slate-900 dark:text-zinc-100">
                    {selectedDateStr
                      ? `Events & Holidays on ${formatDateDisplay(selectedDateStr)}`
                      : `${MONTH_NAMES[currentMonth]} ${currentYear} — Holidays, Celebrations & Events`}
                  </h3>
                  <span className="text-[10px] sm:text-xs font-bold px-2 sm:px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300">
                    {displayedEventsList.length} {displayedEventsList.length === 1 ? "item" : "items"}
                  </span>
                  {holidaysCount > 0 && !selectedDateStr && (
                    <span className="text-[10px] sm:text-xs font-bold px-2 sm:px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 flex items-center gap-1">
                      <Palmtree className="w-3 h-3" /> {holidaysCount} School Holiday{holidaysCount !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  {selectedDateStr
                    ? "Showing events for this date. Tap 'Show All' or tap the date again to view the entire month."
                    : `Scheduled holidays, celebrations, and events for ${MONTH_NAMES[currentMonth]} ${currentYear}. Tap any calendar day above to inspect that specific date.`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
              {selectedDateStr && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedDateStr(null)}
                  className="rounded-xl text-[11px] sm:text-xs font-bold gap-1.5 h-7 sm:h-8 border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800"
                >
                  <CalendarDays className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#2563EB]" /> Show All {MONTH_NAMES[currentMonth]}
                </Button>
              )}
              {canManage && (
                <Button
                  size="sm"
                  onClick={() => {
                    setInitialDateForForm(selectedDateStr || "");
                    setEditingEvent(null);
                    setFormModalOpen(true);
                  }}
                  className="bg-[#2563EB] hover:bg-[#1E40AF] text-white text-[11px] sm:text-xs font-bold rounded-xl px-3 sm:px-3.5 h-7 sm:h-8 gap-1.5 shadow-2xs"
                >
                  <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Add {selectedDateStr ? "for This Date" : "Event / Holiday"}
                </Button>
              )}
            </div>
          </div>

          {/* Cards Grid */}
          {displayedEventsList.length === 0 ? (
            <div className="py-10 text-center flex flex-col items-center justify-center gap-2.5 bg-slate-50/50 dark:bg-zinc-800/20 rounded-2xl border border-dashed border-slate-200 dark:border-zinc-800 p-6">
              <div className="p-3 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-400">
                <Palmtree className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-700 dark:text-zinc-300">
                {selectedDateStr
                  ? "No events or holidays scheduled on this date"
                  : `No events or holidays found for ${MONTH_NAMES[currentMonth]} ${currentYear}`}
              </p>
              <p className="text-xs text-slate-400 max-w-sm">
                {selectedDateStr
                  ? "Click 'Show All' to view other dates in this month, or create an event for this date."
                  : canManage
                  ? "Use the 'Add Event / Holiday' button above to schedule items for this month."
                  : "Check back later as school management publishes scheduled activities."}
              </p>
              <div className="flex items-center gap-2 mt-2">
                {selectedDateStr && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedDateStr(null)}
                    className="rounded-xl text-xs font-bold"
                  >
                    View All Month Events
                  </Button>
                )}
                {canManage && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setInitialDateForForm(selectedDateStr || "");
                      setEditingEvent(null);
                      setFormModalOpen(true);
                    }}
                    className="bg-[#2563EB] hover:bg-[#1E40AF] text-white rounded-xl text-xs font-bold"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Item
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {displayedEventsList.map((ev) => {
                const cfg = getEventTypeConfig(ev.event_type);
                const Icon = cfg.icon;
                const isoDate = toISODateString(ev.start_date);
                let monthStr = "EVENT";
                let dayNumber = "";
                let dayOfWeek = "";
                if (isoDate) {
                  try {
                    const [y, m, d] = isoDate.split("-").map(Number);
                    if (y && m && d) {
                      const dt = new Date(y, m - 1, d);
                      monthStr = dt.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
                      dayNumber = String(d);
                      dayOfWeek = dt.toLocaleDateString("en-US", { weekday: "short" });
                    }
                  } catch {}
                }

                const isHolidayItem = ev.is_holiday || ev.event_type === "HOLIDAY";
                const hasRange = ev.end_date && ev.end_date !== ev.start_date;

                return (
                  <div
                    key={ev.id}
                    onClick={() => setViewingDetailEvent(ev)}
                    className={`group p-4 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between gap-3 ${
                      isHolidayItem
                        ? "border-amber-200/90 dark:border-amber-800/60 bg-gradient-to-br from-amber-50/60 via-white to-amber-50/20 dark:from-amber-950/20 dark:via-zinc-900 dark:to-amber-950/10 hover:shadow-md hover:border-amber-400"
                        : ev.event_type === "CELEBRATION"
                        ? "border-sky-200/90 dark:border-sky-800/60 bg-gradient-to-br from-sky-50/60 via-white to-sky-50/20 dark:from-sky-950/20 dark:via-zinc-900 dark:to-sky-950/10 hover:shadow-md hover:border-sky-400"
                        : ev.event_type === "EXAM"
                        ? "border-rose-200/90 dark:border-rose-800/60 bg-gradient-to-br from-rose-50/60 via-white to-rose-50/20 dark:from-rose-950/20 dark:via-zinc-900 dark:to-rose-950/10 hover:shadow-md hover:border-rose-400"
                        : "border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:shadow-md hover:border-slate-300 dark:hover:border-zinc-700"
                    }`}
                  >
                    {/* Top Row: Date Pill, Badges, Actions */}
                    <div className="flex items-start gap-2.5 sm:gap-3">
                      <div className="w-11 h-12 sm:w-12 sm:h-14 rounded-xl sm:rounded-2xl bg-white dark:bg-zinc-800 shadow-2xs border border-slate-200/80 dark:border-zinc-700/80 flex flex-col items-center justify-center shrink-0 text-center">
                        <span className="text-[8px] sm:text-[9px] font-black uppercase text-slate-500 tracking-wider leading-none">
                          {monthStr}
                        </span>
                        <span className="text-base sm:text-lg font-black text-slate-900 dark:text-zinc-100 leading-tight">
                          {dayNumber}
                        </span>
                        <span className="text-[8px] sm:text-[9px] font-bold text-slate-400 leading-none">
                          {dayOfWeek}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1 space-y-0.5 sm:space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge className={`${cfg.bgClass} text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.2 sm:py-0.5 rounded-full flex items-center gap-1 border`}>
                            <Icon className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> {cfg.label}
                          </Badge>
                          {isHolidayItem && (
                            <span className="text-[9px] sm:text-[10px] font-black px-1.5 sm:px-2 py-0.2 sm:py-0.5 rounded-full bg-amber-500 text-white shadow-2xs">
                              School Closed
                            </span>
                          )}
                        </div>

                        <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-zinc-100 line-clamp-1 group-hover:text-[#2563EB] transition-colors first-letter:uppercase">
                          {capitalizeFirstLetter(ev.title || ev.name)}
                        </h4>
                      </div>

                      {canManage && (
                        <div className="flex items-center gap-1 shrink-0 ml-auto" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingEvent(ev);
                              setFormModalOpen(true);
                            }}
                            className="p-1 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                            title="Edit Event"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmEvent(ev)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title="Delete Event"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Description snippet */}
                    {ev.description && (
                      <p className="text-xs text-slate-600 dark:text-zinc-400 line-clamp-2 leading-relaxed first-letter:uppercase">
                        {capitalizeFirstLetter(ev.description)}
                      </p>
                    )}

                    {/* Footer metadata */}
                    <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/80 flex items-center gap-3 text-[11px] text-slate-500 dark:text-zinc-400 flex-wrap">
                      {hasRange ? (
                        <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-zinc-300">
                          <CalendarIcon className="w-3 h-3 text-[#2563EB]" />
                          {formatDateDisplay(ev.start_date)} - {formatDateDisplay(ev.end_date)}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="w-3 h-3 text-slate-400" />
                          {formatDateDisplay(ev.start_date)}
                        </span>
                      )}



                      {ev.location && (
                        <span className="flex items-center gap-1 max-w-[140px] truncate" title={ev.location}>
                          <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span className="truncate">{ev.location}</span>
                        </span>
                      )}

                      {ev.target_audience && ev.target_audience !== "ALL" && (
                        <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400">
                          {ev.target_audience}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      ) : (
        /* ─── AGENDA / LIST VIEW ─────────────────────────────────────────── */
        <div className="space-y-3">
          {filteredEvents.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center justify-center gap-3 bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200/80 dark:border-zinc-800 shadow-2xs p-6">
              <CalendarIcon className="w-8 h-8 text-slate-300 stroke-[1.5]" />
              <h3 className="text-base font-bold text-slate-800 dark:text-zinc-200">No events or holidays scheduled</h3>
              <p className="text-xs text-slate-400 max-w-sm">
                {canManage
                  ? "Click the 'Add Event / Holiday' button above to create items for the academic calendar."
                  : "Check back later when school management publishes upcoming schedules."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredEvents.map((ev) => {
                const cfg = getEventTypeConfig(ev.event_type);
                const Icon = cfg.icon;
                const isoDate = toISODateString(ev.start_date);
                let monthStr = "EVENT";
                let dayNumber = "";
                let dayOfWeek = "";
                if (isoDate) {
                  try {
                    const [y, m, d] = isoDate.split("-").map(Number);
                    if (y && m && d) {
                      const dt = new Date(y, m - 1, d);
                      monthStr = dt.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
                      dayNumber = String(d);
                      dayOfWeek = dt.toLocaleDateString("en-US", { weekday: "short" });
                    }
                  } catch {}
                }

                return (
                  <motion.div
                    key={ev.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200/80 dark:border-zinc-800 p-4 sm:p-5 shadow-2xs hover:border-[#2563EB]/35 transition-all flex items-start gap-3 sm:gap-4 group"
                  >
                    {/* Date Block */}
                    <div className="w-13 sm:w-16 rounded-2xl bg-blue-50/70 dark:bg-zinc-800/60 border border-blue-100 dark:border-zinc-700 flex flex-col items-center justify-center py-2 px-1 text-center shrink-0 shadow-2xs">
                      <span className="text-[10px] font-black uppercase text-[#2563EB] tracking-wider">
                        {monthStr}
                      </span>
                      <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-zinc-100 leading-none my-0.5 sm:my-1">
                        {dayNumber || "--"}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold">
                        {dayOfWeek}
                      </span>
                    </div>

                    {/* Event Info */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge className={`${cfg.bgClass} text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1`}>
                            <Icon className="w-3 h-3" />
                            {cfg.label}
                          </Badge>

                          {ev.is_holiday && (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                              School Closed
                            </span>
                          )}
                        </div>

                        {canManage && (
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingEvent(ev);
                                setFormModalOpen(true);
                              }}
                              className="h-7 w-7 p-0 rounded-xl text-amber-600 hover:bg-amber-50"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setDeleteConfirmEvent(ev)}
                              className="h-7 w-7 p-0 rounded-xl text-rose-600 hover:bg-rose-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>

                      <h3
                        onClick={() => setViewingDetailEvent(ev)}
                        className="text-sm sm:text-base font-black text-slate-900 dark:text-zinc-100 hover:text-[#2563EB] cursor-pointer first-letter:uppercase line-clamp-1 leading-snug"
                      >
                        {capitalizeFirstLetter(ev.title || ev.name)}
                      </h3>

                      {ev.description && (
                        <p className="text-xs text-slate-600 dark:text-zinc-400 line-clamp-2 leading-relaxed first-letter:uppercase">
                          {capitalizeFirstLetter(ev.description)}
                        </p>
                      )}

                      <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between gap-2 text-[11px] text-slate-400 flex-wrap">
                        <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-zinc-300">
                          <Clock className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
                          <span>{formatDateDisplay(ev.start_date)}</span>
                          {ev.end_date && ev.end_date !== ev.start_date && (
                            <span> &rarr; {formatDateDisplay(ev.end_date)}</span>
                          )}
                        </div>

                        {ev.location && (
                          <div className="flex items-center gap-1 font-medium text-slate-500 truncate max-w-[140px]">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{ev.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* (Day events and monthly celebrations/holidays are shown in the bottom section of the calendar) */}

      {/* ─── SINGLE EVENT DETAIL VIEW MODAL ─────────────────────────────── */}
      <AnimatePresence>
        {viewingDetailEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setViewingDetailEvent(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white dark:bg-zinc-900 rounded-none sm:rounded-3xl shadow-2xl w-full h-[100dvh] sm:h-auto sm:max-h-[85vh] sm:max-w-md p-4 sm:p-6 overflow-y-auto z-10 border-0 sm:border border-slate-200 dark:border-zinc-800 space-y-4"
            >
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-zinc-800">
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    onClick={() => setViewingDetailEvent(null)}
                    className="sm:hidden p-1.5 -ml-1 text-slate-700 dark:text-zinc-300 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
                    aria-label="Back"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {(() => {
                        const cfg = getEventTypeConfig(viewingDetailEvent.event_type);
                        const Icon = cfg.icon;
                        return (
                          <Badge className={`${cfg.bgClass} text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1`}>
                            <Icon className="w-3 h-3" /> {cfg.label}
                          </Badge>
                        );
                      })()}
                      {viewingDetailEvent.is_holiday && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                          School Closed
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-black text-slate-900 dark:text-zinc-100 first-letter:uppercase truncate">
                      {capitalizeFirstLetter(viewingDetailEvent.title || viewingDetailEvent.name)}
                    </h3>
                  </div>
                </div>

                <button
                  onClick={() => setViewingDetailEvent(null)}
                  className="hidden sm:block p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Schedule Info */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-zinc-800/40 text-xs">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Date & Duration</p>
                  <p className="font-bold text-slate-800 dark:text-zinc-200 mt-0.5">
                    {formatDateDisplay(viewingDetailEvent.start_date)}
                    {viewingDetailEvent.end_date && viewingDetailEvent.end_date !== viewingDetailEvent.start_date && (
                      <span> &rarr; {formatDateDisplay(viewingDetailEvent.end_date)}</span>
                    )}
                  </p>
                </div>
                {viewingDetailEvent.location && (
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Location / Venue</p>
                    <p className="font-bold text-slate-800 dark:text-zinc-200 mt-0.5 truncate">
                      {viewingDetailEvent.location}
                    </p>
                  </div>
                )}
              </div>

              {/* Description */}
              {viewingDetailEvent.description && (
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Details & Agenda</p>
                  <div className="p-3.5 rounded-2xl bg-slate-50/50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800 text-xs text-slate-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed font-normal first-letter:uppercase">
                    {capitalizeFirstLetter(viewingDetailEvent.description)}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-zinc-800">
                <Button
                  onClick={() => setViewingDetailEvent(null)}
                  className="rounded-2xl h-9 px-5 text-xs font-bold bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] text-white"
                >
                  Close
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── CREATE / EDIT EVENT MODAL (MANAGERS ONLY) ──────────────────── */}
      <AnimatePresence>
        {formModalOpen && (
          <EventFormModal
            event={editingEvent}
            initialDate={initialDateForForm}
            onClose={() => {
              setFormModalOpen(false);
              setEditingEvent(null);
            }}
            onSaved={() => {
              fetchEventsList(true);
            }}
          />
        )}
      </AnimatePresence>

      {/* ─── DELETE CONFIRM MODAL ──────────────────────────────────────── */}
      <AnimatePresence>
        {deleteConfirmEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setDeleteConfirmEvent(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-[95vw] sm:max-w-sm p-5 sm:p-6 z-10 border border-slate-200 dark:border-zinc-800 space-y-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6 stroke-[2.2]" />
              </div>

              <div className="text-center space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100">Delete Event / Holiday?</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Are you sure you want to delete &ldquo;
                  <span className="font-semibold text-slate-700 dark:text-zinc-300 first-letter:uppercase">
                    {capitalizeFirstLetter(deleteConfirmEvent.title || deleteConfirmEvent.name)}
                  </span>
                  &rdquo;? This will remove it from the school calendar.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setDeleteConfirmEvent(null)}
                  disabled={deleting}
                  className="rounded-2xl h-10 text-xs font-bold border-slate-200"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDeleteConfirm}
                  disabled={deleting}
                  className="bg-rose-600 hover:bg-rose-700 text-white rounded-2xl h-10 text-xs font-bold gap-2"
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

// ─── EVENT FORM MODAL (CREATE / EDIT) ────────────────────────────────────────
function EventFormModal({
  event,
  initialDate,
  onClose,
  onSaved,
}: {
  event: SchoolEventResponse | null;
  initialDate?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!event;
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  const [title, setTitle] = useState(event?.title || event?.name || "");
  const [eventType, setEventType] = useState<string>(event?.event_type || "EVENT");
  const [isHoliday, setIsHoliday] = useState<boolean>(event?.is_holiday ?? false);
  const [startDate, setStartDate] = useState<string>(toISODateString(event?.start_date) || initialDate || todayStr);
  const [endDate, setEndDate] = useState<string>(toISODateString(event?.end_date) || "");
  const [description, setDescription] = useState<string>(event?.description || "");
  const [targetAudience, setTargetAudience] = useState<string>(event?.target_audience || "ALL");
  const [audienceDrawerOpen, setAudienceDrawerOpen] = useState(false);
  const [location, setLocation] = useState<string>(event?.location || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please enter an event or holiday title.");
      return;
    }
    if (!startDate) {
      setError("Please choose a start date.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload: SchoolEventPayload = {
        title: capitalizeFirstLetter(title.trim()),
        name: capitalizeFirstLetter(title.trim()),
        event_type: eventType,
        is_holiday: eventType === "HOLIDAY" ? true : isHoliday,
        start_date: toISODateString(startDate),
        end_date: endDate ? toISODateString(endDate) : null,
        description: capitalizeFirstLetter(description.trim()),
        target_audience: targetAudience,
        location: location.trim() || undefined,
      };

      if (isEdit && event) {
        await updateSchoolEvent(event.id, payload);
        toast.success("Event updated successfully!");
      } else {
        await createSchoolEvent(payload);
        toast.success("Event scheduled on school calendar!");
      }

      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save event.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        className="relative bg-white dark:bg-zinc-900 rounded-none sm:rounded-3xl shadow-2xl w-full h-[100dvh] sm:h-auto sm:max-h-[90vh] sm:max-w-xl p-4 sm:p-7 overflow-y-auto z-10 border-0 sm:border border-slate-200 dark:border-zinc-800 space-y-5"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={onClose}
              className="sm:hidden p-1.5 -ml-1 text-slate-700 dark:text-zinc-300 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="p-2 sm:p-2.5 rounded-2xl bg-gradient-to-br from-[#2563EB]/15 to-[#1D4ED8]/25 text-[#2563EB] border border-[#2563EB]/20 shrink-0">
              <CalendarIcon className="h-4 w-4 sm:h-5 sm:w-5 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-zinc-100 truncate">
                {isEdit ? "Edit Calendar Event / Holiday" : "Schedule Event / Holiday"}
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 truncate">
                Add an official date to the school academic calendar
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="hidden sm:block p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
              Event / Holiday Name <span className="text-rose-500">*</span>
            </label>
            <Input
              placeholder="e.g., Diwali Vacation, Annual Sports Day, Mid-Term Exam"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-10 text-xs rounded-2xl bg-slate-50/80 dark:bg-zinc-800/60 border-slate-200 dark:border-zinc-700 font-medium focus-visible:border-[#2563EB] focus-visible:ring-2 focus-visible:ring-[#2563EB]/20"
              required
            />
          </div>

          {/* Event Type Grid Cards */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
              Event Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {EVENT_TYPES.map((t) => {
                const isSelected = eventType === t.value;
                const Icon = t.icon;
                return (
                  <div
                    key={t.value}
                    onClick={() => {
                      setEventType(t.value);
                      if (t.value === "HOLIDAY") setIsHoliday(true);
                    }}
                    className={`cursor-pointer p-2.5 rounded-2xl border transition-all flex items-center gap-2 ${
                      isSelected
                        ? "border-[#2563EB] bg-blue-50/40 dark:bg-blue-950/30 ring-2 ring-[#2563EB]/20 shadow-2xs font-bold"
                        : "border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-800/40 hover:border-slate-300"
                    }`}
                  >
                    <div
                      className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${t.color}15`, color: t.color }}
                    >
                      <Icon className="w-3.5 h-3.5 stroke-[2.2]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-slate-900 dark:text-zinc-100 truncate">{t.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Holiday Toggle */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/80 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700">
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                <Palmtree className="w-3.5 h-3.5 text-amber-500" />
                School Holiday / Off-Day
              </p>
              <p className="text-[10px] text-slate-400">Mark as non-working day for students and staff</p>
            </div>
            <input
              type="checkbox"
              checked={isHoliday || eventType === "HOLIDAY"}
              onChange={(e) => setIsHoliday(e.target.checked)}
              disabled={eventType === "HOLIDAY"}
              className="w-4 h-4 text-[#2563EB] rounded accent-[#2563EB] cursor-pointer"
            />
          </div>

          {/* Start Date & End Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Start Date <span className="text-rose-500">*</span>
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-10 text-xs rounded-2xl bg-slate-50/80 dark:bg-zinc-800/60 border-slate-200 dark:border-zinc-700 font-medium"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center justify-between">
                <span>End Date (Optional)</span>
                <span className="text-[10px] text-slate-400 font-normal">For multi-day events</span>
              </label>
              <Input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-10 text-xs rounded-2xl bg-slate-50/80 dark:bg-zinc-800/60 border-slate-200 dark:border-zinc-700 font-medium"
              />
            </div>
          </div>

          {/* Target Audience & Venue */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Target Audience
              </label>
              {/* Mobile Audience Drawer Trigger */}
              <div className="block sm:hidden">
                <button
                  type="button"
                  onClick={() => setAudienceDrawerOpen(true)}
                  className="w-full h-10 px-3.5 rounded-2xl bg-slate-50/80 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-zinc-200 active:scale-[0.99] transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2 truncate">
                    {(() => {
                      const matched = AUDIENCE_OPTIONS.find((a) => a.value === targetAudience);
                      const Icon = matched?.icon || Users2;
                      return (
                        <>
                          <Icon className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
                          <span className="truncate">{matched?.label || "Everyone"}</span>
                        </>
                      );
                    })()}
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                </button>
              </div>

              {/* Mobile Bottom Drawer for Audience Selection */}
              <MobileBottomDrawer
                isOpen={audienceDrawerOpen}
                onClose={() => setAudienceDrawerOpen(false)}
                title="Select Target Audience"
                subtitle="Who should see this event or holiday?"
              >
                <div className="space-y-2 py-1">
                  {AUDIENCE_OPTIONS.map((a) => {
                    const isSelected = targetAudience === a.value;
                    const Icon = a.icon || Users2;
                    return (
                      <button
                        key={a.value}
                        type="button"
                        onClick={() => {
                          setTargetAudience(a.value);
                          setAudienceDrawerOpen(false);
                        }}
                        className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all text-left cursor-pointer ${
                          isSelected
                            ? "border-[#2563EB] bg-blue-50/70 dark:bg-blue-950/40 text-[#2563EB] font-black shadow-xs ring-1 ring-[#2563EB]"
                            : "border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 font-semibold hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                            style={{
                              backgroundColor: isSelected ? "#2563EB15" : "#64748b15",
                              color: isSelected ? "#2563EB" : "#64748b",
                            }}
                          >
                            <Icon className="w-4 h-4 stroke-[2.2]" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-bold truncate">{a.label}</p>
                            {a.desc && <p className="text-[10px] text-slate-400 truncate">{a.desc}</p>}
                          </div>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-[#2563EB] text-white flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </MobileBottomDrawer>

              {/* Desktop Native Select */}
              <div className="hidden sm:block">
                <select
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  className="w-full h-10 px-3 text-xs rounded-2xl bg-slate-50/80 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 font-semibold text-slate-800 dark:text-zinc-200 cursor-pointer"
                >
                  {AUDIENCE_OPTIONS.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Venue / Location (Optional)
              </label>
              <Input
                placeholder="e.g. School Auditorium, Ground"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="h-10 text-xs rounded-2xl bg-slate-50/80 dark:bg-zinc-800/60 border-slate-200 dark:border-zinc-700 font-medium"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center justify-between">
              <span>Description / Event Schedule</span>
              <span className="text-[10px] text-slate-400 font-normal">{description.length} chars</span>
            </label>
            <Textarea
              placeholder="Provide event schedule, instructions, or agenda..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="text-xs rounded-2xl bg-slate-50/80 dark:bg-zinc-800/60 border-slate-200 dark:border-zinc-700 font-medium leading-relaxed"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-zinc-800">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
              className="rounded-2xl h-10 text-xs font-bold px-4 border-slate-200"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] hover:from-[#1E40AF] hover:to-[#1D4ED8] text-white rounded-2xl h-10 text-xs font-bold px-6 gap-2 shadow-md shadow-[#2563EB]/25"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  {isEdit ? "Update Event" : "Add to Calendar"}
                </>
              )}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
