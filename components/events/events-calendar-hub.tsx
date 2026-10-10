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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  getSchoolEvents,
  createSchoolEvent,
  updateSchoolEvent,
  deleteSchoolEvent,
  seedDefaultSchoolHolidays,
  type SchoolEventResponse,
  type SchoolEventPayload,
} from "@/lib/events";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

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
    color: "#5826df",
    bgClass: "bg-indigo-50 text-[#5826df] dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200",
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

const AUDIENCE_OPTIONS = [
  { value: "ALL", label: "Everyone (All Roles)" },
  { value: "STUDENTS_PARENTS", label: "Students & Parents" },
  { value: "STUDENT", label: "Students Only" },
  { value: "PARENT", label: "Parents Only" },
  { value: "TEACHER", label: "Teachers Only" },
  { value: "STAFF", label: "Staff & Administration" },
];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

function formatDateDisplay(dateStr?: string) {
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

  const [events, setEvents] = useState<SchoolEventResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("ALL");
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

  // Month Statistics
  const monthEvents = useMemo(() => {
    return events.filter((ev) => {
      const startIso = toISODateString(ev.start_date);
      if (!startIso) return false;
      const [y, m] = startIso.split("-").map(Number);
      return y === currentYear && m === currentMonth + 1;
    });
  }, [events, currentYear, currentMonth]);

  const holidaysCount = monthEvents.filter((e) => e.is_holiday || e.event_type === "HOLIDAY").length;
  const schoolEventsCount = monthEvents.filter((e) => e.event_type === "EVENT" || e.event_type === "CELEBRATION").length;
  const examsCount = monthEvents.filter((e) => e.event_type === "EXAM").length;
  const meetingsCount = monthEvents.filter((e) => e.event_type === "MEETING").length;

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

  // Events for selected date drawer
  const selectedDateEvents = useMemo(() => {
    if (!selectedDateStr) return [];
    return events.filter((ev) => {
      const startIso = toISODateString(ev.start_date);
      const endIso = toISODateString(ev.end_date) || startIso;
      if (!startIso) return false;
      if (startIso === selectedDateStr) return true;
      if (endIso && endIso >= startIso) {
        return selectedDateStr >= startIso && selectedDateStr <= endIso;
      }
      return false;
    });
  }, [events, selectedDateStr]);

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
    <div className="space-y-6 pb-16 min-w-0 max-w-7xl mx-auto">
      {/* ─── TOP HEADER CARD ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-slate-200/80 dark:border-zinc-800 shadow-2xs">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-[#5826df]/15 to-[#6d3df5]/25 text-[#5826df] border border-[#5826df]/20 shadow-2xs">
              <CalendarIcon className="h-6 w-6 stroke-[2.2]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-zinc-100">
                {pageTitle || defaultTitle}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-0.5">
                {pageSubtitle || defaultSubtitle}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchEventsList(true)}
            disabled={refreshing}
            className="h-10 rounded-2xl px-4 text-xs font-bold text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:border-[#5826df]/30 hover:bg-indigo-50/40 hover:text-[#5826df] gap-2 transition-all shadow-2xs"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin text-[#5826df]" : ""}`} />
            Refresh
          </Button>

          {canManage && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSeedDefaults}
                disabled={isSeeding || refreshing}
                title="Automatically load and synchronize standard public and school holidays"
                className="h-10 rounded-2xl px-4 text-xs font-bold text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/60 hover:bg-amber-50 dark:hover:bg-amber-950/40 gap-2 transition-all shadow-2xs"
              >
                <Sparkles className={`h-4 w-4 ${isSeeding ? "animate-spin text-amber-500" : "text-amber-500"}`} />
                {isSeeding ? "Syncing..." : "Sync Public Holidays"}
              </Button>

              <Button
                onClick={() => {
                  setEditingEvent(null);
                  setInitialDateForForm("");
                  setFormModalOpen(true);
                }}
                className="h-10 bg-gradient-to-r from-[#5826df] to-[#6d3df5] hover:from-[#4c1fc7] hover:to-[#5e2de0] text-white font-bold text-xs rounded-2xl px-5 gap-2 shadow-md shadow-[#5826df]/25 transition-all hover:shadow-[#5826df]/35 active:scale-[0.98]"
              >
                <Plus className="h-4 w-4 stroke-[2.5]" />
                Add Event / Holiday
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ─── STAT CARDS ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
          <CardContent className="p-4 sm:p-5 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-100 dark:border-amber-900/60 flex items-center justify-center text-amber-600 shrink-0 shadow-2xs">
              <Palmtree className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Holidays ({MONTH_NAMES[currentMonth].slice(0, 3)})</p>
              <p className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400">{holidaysCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
          <CardContent className="p-4 sm:p-5 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-center text-[#5826df] shrink-0 shadow-2xs">
              <Trophy className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Events & Fests</p>
              <p className="text-xl sm:text-2xl font-black text-[#5826df] dark:text-indigo-400">{schoolEventsCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
          <CardContent className="p-4 sm:p-5 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-100 dark:border-rose-900/60 flex items-center justify-center text-rose-600 shrink-0 shadow-2xs">
              <BookOpen className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Exams & Tests</p>
              <p className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400">{examsCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
          <CardContent className="p-4 sm:p-5 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-900/60 flex items-center justify-center text-emerald-600 shrink-0 shadow-2xs">
              <Users2 className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Meetings & PTM</p>
              <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">{meetingsCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── CALENDAR CONTROLS & FILTER PILLS ────────────────────────────── */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200/80 dark:border-zinc-800 p-5 space-y-4 shadow-2xs">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Month / Year Navigator */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevMonth}
              className="p-2 rounded-2xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-700 dark:text-zinc-300 transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 dark:bg-zinc-800/60 rounded-2xl border border-slate-200 dark:border-zinc-700">
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-zinc-100 tracking-tight">
                {MONTH_NAMES[currentMonth]} {currentYear}
              </h2>
            </div>

            <button
              onClick={handleNextMonth}
              className="p-2 rounded-2xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-700 dark:text-zinc-300 transition-colors"
              title="Next Month"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <button
              onClick={handleGoToday}
              className="px-3 py-2 rounded-2xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/50 text-[#5826df] hover:bg-indigo-100 border border-[#5826df]/20 transition-all ml-1"
            >
              Today
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-zinc-800 rounded-2xl self-start md:self-auto">
            <button
              onClick={() => setViewMode("CALENDAR")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === "CALENDAR"
                  ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-xs"
                  : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              Month Grid
            </button>
            <button
              onClick={() => setViewMode("AGENDA")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === "AGENDA"
                  ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-xs"
                  : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
              }`}
            >
              <ListTodo className="w-3.5 h-3.5" />
              Agenda List
            </button>
          </div>
        </div>

        {/* Filter Pills Bar */}
        <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Filter:
          </span>

          <button
            onClick={() => setSelectedTypeFilter("ALL")}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap ${
              selectedTypeFilter === "ALL"
                ? "bg-[#5826df] text-white shadow-xs"
                : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200"
            }`}
          >
            All Events & Holidays
          </button>

          <button
            onClick={() => setSelectedTypeFilter("HOLIDAY")}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
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
            className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              selectedTypeFilter === "EVENT"
                ? "bg-[#5826df] text-white shadow-xs"
                : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200"
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            School Events
          </button>

          <button
            onClick={() => setSelectedTypeFilter("EXAM")}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
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
            className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
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
            className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
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
          <Loader2 className="w-8 h-8 text-[#5826df] animate-spin" />
          <p className="text-xs font-bold text-slate-500">Loading academic calendar...</p>
        </div>
      ) : viewMode === "CALENDAR" ? (
        /* ─── MONTH GRID VIEW ────────────────────────────────────────────── */
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200/80 dark:border-zinc-800 overflow-hidden shadow-2xs">
          {/* Days Header */}
          <div className="grid grid-cols-7 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-800/50 text-center text-xs font-black text-slate-600 dark:text-zinc-400 py-3">
            {DAYS_OF_WEEK.map((d, i) => (
              <div key={d} className={i === 0 ? "text-rose-500" : ""}>
                {d}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 dark:divide-zinc-800/80">
            {calendarDays.map((day, idx) => {
              const isSunday = idx % 7 === 0;
              const hasEvents = day.events.length > 0;
              return (
                <div
                  key={`${day.dateStr}-${idx}`}
                  onClick={() => {
                    if (day.isCurrentMonth) {
                      setSelectedDateStr(day.dateStr);
                    }
                  }}
                  className={`min-h-[105px] sm:min-h-[120px] p-2 flex flex-col justify-between transition-colors cursor-pointer group ${
                    !day.isCurrentMonth
                      ? "bg-slate-50/40 dark:bg-zinc-950/40 text-slate-300 dark:text-zinc-600 cursor-default"
                      : isSunday
                      ? "bg-rose-50/20 dark:bg-rose-950/10 hover:bg-slate-50 dark:hover:bg-zinc-800/50"
                      : "hover:bg-slate-50 dark:hover:bg-zinc-800/50"
                  }`}
                >
                  {/* Day Header */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-black w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                        day.isToday
                          ? "bg-[#5826df] text-white shadow-xs"
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
                      <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-slate-200/80 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
                        {day.events.length}
                      </span>
                    )}
                  </div>

                  {/* Event Badges List in Cell */}
                  <div className="space-y-1 my-1 overflow-hidden">
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
                          title={`${ev.title} (${cfg.label})`}
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
                      <p className="text-[9px] font-black text-[#5826df] dark:text-indigo-400 pl-1">
                        +{day.events.length - 2} more
                      </p>
                    )}
                  </div>

                  {/* Cell Bottom Quick Action for Manager */}
                  {canManage && day.isCurrentMonth && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-end">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingEvent(null);
                          setInitialDateForForm(day.dateStr);
                          setFormModalOpen(true);
                        }}
                        className="text-[10px] font-bold text-[#5826df] hover:underline flex items-center gap-0.5"
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
                return (
                  <motion.div
                    key={ev.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200/80 dark:border-zinc-800 p-5 shadow-2xs hover:border-[#5826df]/35 transition-all flex flex-col justify-between gap-3"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <Badge className={`${cfg.bgClass} text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5`}>
                          <Icon className="w-3 h-3" />
                          {cfg.label}
                        </Badge>

                        {ev.is_holiday && (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                            School Closed
                          </span>
                        )}

                        {canManage && (
                          <div className="flex items-center gap-1 ml-auto">
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
                        className="text-base font-black text-slate-900 dark:text-zinc-100 hover:text-[#5826df] cursor-pointer first-letter:uppercase"
                      >
                        {capitalizeFirstLetter(ev.title || ev.name)}
                      </h3>

                      {ev.description && (
                        <p className="text-xs text-slate-600 dark:text-zinc-400 line-clamp-2 leading-relaxed first-letter:uppercase">
                          {capitalizeFirstLetter(ev.description)}
                        </p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between gap-2 text-[11px] text-slate-400">
                      <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-zinc-300">
                        <Clock className="w-3.5 h-3.5 text-[#5826df]" />
                        <span>{formatDateDisplay(ev.start_date)}</span>
                        {ev.end_date && ev.end_date !== ev.start_date && (
                          <span> &rarr; {formatDateDisplay(ev.end_date)}</span>
                        )}
                      </div>

                      {ev.location && (
                        <div className="flex items-center gap-1 font-medium text-slate-500 truncate">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{ev.location}</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── DAY EVENTS DRAWER / DETAILS MODAL ───────────────────────────── */}
      <AnimatePresence>
        {selectedDateStr && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setSelectedDateStr(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto z-10 border border-slate-200 dark:border-zinc-800 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-2xl bg-indigo-50 text-[#5826df] border border-indigo-100">
                    <CalendarIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-zinc-100">
                      {formatDateDisplay(selectedDateStr)}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {selectedDateEvents.length} Event{selectedDateEvents.length !== 1 ? "s" : ""} on this date
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedDateStr(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-zinc-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Day Events List */}
              <div className="space-y-2.5">
                {selectedDateEvents.length === 0 ? (
                  <div className="py-10 text-center space-y-2">
                    <p className="text-xs text-slate-400">No events or holidays scheduled for this date.</p>
                    {canManage && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setInitialDateForForm(selectedDateStr);
                          setEditingEvent(null);
                          setFormModalOpen(true);
                        }}
                        className="bg-[#5826df] hover:bg-[#4c1fc7] text-white text-xs font-bold rounded-xl px-4 gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Event on this Date
                      </Button>
                    )}
                  </div>
                ) : (
                  selectedDateEvents.map((ev) => {
                    const cfg = getEventTypeConfig(ev.event_type);
                    const Icon = cfg.icon;
                    return (
                      <div
                        key={ev.id}
                        className="p-4 rounded-2xl border border-slate-200/80 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/40 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <Badge className={`${cfg.bgClass} text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1`}>
                            <Icon className="w-3 h-3" /> {cfg.label}
                          </Badge>
                          {ev.is_holiday && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                              Holiday
                            </span>
                          )}

                          {canManage && (
                            <div className="flex items-center gap-1 ml-auto">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingEvent(ev);
                                  setFormModalOpen(true);
                                }}
                                className="h-6 w-6 p-0 text-amber-600 hover:bg-amber-50 rounded-lg"
                              >
                                <Edit3 className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setDeleteConfirmEvent(ev)}
                                className="h-6 w-6 p-0 text-rose-600 hover:bg-rose-50 rounded-lg"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                        </div>

                        <h4 className="text-sm font-black text-slate-900 dark:text-zinc-100 first-letter:uppercase">
                          {capitalizeFirstLetter(ev.title || ev.name)}
                        </h4>

                        {ev.description && (
                          <p className="text-xs text-slate-600 dark:text-zinc-400 whitespace-pre-wrap leading-relaxed first-letter:uppercase">
                            {capitalizeFirstLetter(ev.description)}
                          </p>
                        )}

                        {ev.location && (
                          <p className="text-[11px] text-slate-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-[#5826df]" /> {ev.location}
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {canManage && selectedDateEvents.length > 0 && (
                <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 flex justify-end">
                  <Button
                    size="sm"
                    onClick={() => {
                      setInitialDateForForm(selectedDateStr);
                      setEditingEvent(null);
                      setFormModalOpen(true);
                    }}
                    className="bg-[#5826df] hover:bg-[#4c1fc7] text-white text-xs font-bold rounded-xl px-4 gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Another Event
                  </Button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── SINGLE EVENT DETAIL VIEW MODAL ─────────────────────────────── */}
      <AnimatePresence>
        {viewingDetailEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setViewingDetailEvent(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto z-10 border border-slate-200 dark:border-zinc-800 space-y-4"
            >
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-zinc-800">
                <div className="space-y-1.5">
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
                  <h3 className="text-base font-black text-slate-900 dark:text-zinc-100 first-letter:uppercase">
                    {capitalizeFirstLetter(viewingDetailEvent.title || viewingDetailEvent.name)}
                  </h3>
                </div>

                <button
                  onClick={() => setViewingDetailEvent(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-zinc-800"
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
                  className="rounded-2xl h-9 px-5 text-xs font-bold bg-gradient-to-r from-[#5826df] to-[#6d3df5] text-white"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setDeleteConfirmEvent(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-sm p-6 z-10 border border-slate-200 dark:border-zinc-800 space-y-4"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        className="relative bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-xl p-6 sm:p-7 max-h-[92vh] overflow-y-auto z-10 border border-slate-200 dark:border-zinc-800 space-y-5"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-[#5826df]/15 to-[#6d3df5]/25 text-[#5826df] border border-[#5826df]/20">
              <CalendarIcon className="h-5 w-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-zinc-100">
                {isEdit ? "Edit Calendar Event / Holiday" : "Schedule Event / Holiday"}
              </h2>
              <p className="text-xs text-slate-500">
                Add an official date to the school academic calendar
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-zinc-800"
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
              className="h-10 text-xs rounded-2xl bg-slate-50/80 dark:bg-zinc-800/60 border-slate-200 dark:border-zinc-700 font-medium focus-visible:border-[#5826df] focus-visible:ring-2 focus-visible:ring-[#5826df]/20"
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
                        ? "border-[#5826df] bg-indigo-50/40 dark:bg-indigo-950/30 ring-2 ring-[#5826df]/20 shadow-2xs font-bold"
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
              className="w-4 h-4 text-[#5826df] rounded accent-[#5826df] cursor-pointer"
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
              <select
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                className="w-full h-10 px-3 text-xs rounded-2xl bg-slate-50/80 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 font-semibold text-slate-800 dark:text-zinc-200"
              >
                {AUDIENCE_OPTIONS.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
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
              className="bg-gradient-to-r from-[#5826df] to-[#6d3df5] hover:from-[#4c1fc7] hover:to-[#5e2de0] text-white rounded-2xl h-10 text-xs font-bold px-6 gap-2 shadow-md shadow-[#5826df]/25"
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
