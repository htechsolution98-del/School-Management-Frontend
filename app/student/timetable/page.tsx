"use client";

import React, { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Clock,
  Calendar,
  Coffee,
  UserCheck,
  BookOpen,
  Loader2,
} from "lucide-react";
import { fetchWithAuth } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";

const DAYS_OF_WEEK = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function formatTime(timeStr?: string) {
  if (!timeStr) return "--:--";
  try {
    const parts = timeStr.split(":");
    let hours = parseInt(parts[0], 10);
    const minutes = parts[1] || "00";
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${ampm}`;
  } catch {
    return timeStr;
  }
}

export default function StudentTimetablePage() {
  const [timetableList, setTimetableList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string>("thursday");

  const currentWeekday = useMemo(() => {
    const day = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date()).toLowerCase();
    return DAYS_OF_WEEK.includes(day) ? day : "monday";
  }, []);

  useEffect(() => {
    setSelectedDay(currentWeekday);
  }, [currentWeekday]);

  useEffect(() => {
    async function loadTimetable() {
      try {
        setLoading(true);
        const res = await fetchWithAuth(`${API_BASE_URL}/timetable/`);
        if (res.ok) {
          const data = await res.json();
          setTimetableList(Array.isArray(data) ? data : (data.results || []));
        }
      } catch (err) {
        console.error("Failed to load timetable:", err);
      } finally {
        setLoading(false);
      }
    }
    loadTimetable();
  }, []);

  const activeDayTimetable = useMemo(() => {
    return timetableList.find(t => String(t.day || "").toLowerCase() === selectedDay.toLowerCase());
  }, [timetableList, selectedDay]);

  const activeSlots = useMemo(() => {
    if (!activeDayTimetable || !Array.isArray(activeDayTimetable.slots)) return [];
    return [...activeDayTimetable.slots].sort((a, b) => (a.slot_number || 0) - (b.slot_number || 0));
  }, [activeDayTimetable]);

  return (
    <div className="flex flex-col gap-3.5 sm:gap-4 max-w-7xl mx-auto w-full min-w-0 overflow-x-hidden pb-12">
      {/* ─────────────────────────────────────────────────────────────
          1. Hero Card: White BG with Upper Header in Single Line & Left Paragraph
         ───────────────────────────────────────────────────────────── */}
      <motion.div
        className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] relative overflow-hidden flex items-center justify-between gap-3"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex-1 min-w-0 z-10">
          {/* Upper Header in a Single Line */}
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Clock size={18} />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight whitespace-nowrap">
              Class Lecture Timetable
            </h1>
          </div>

          {/* Left Side Paragraph */}
          <p className="text-slate-400 text-xs sm:text-sm mt-1 mb-3.5 font-medium leading-relaxed max-w-[260px] sm:max-w-md">
            View daily subject schedules, period timings, and assigned subject teachers for your class.
          </p>

          {/* Today Date Pill */}
          <div className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold text-slate-800 bg-[#F8F9FE] border border-slate-200/60 rounded-xl px-2.5 py-1.5 shadow-2xs whitespace-nowrap shrink-0">
            <Calendar size={13} className="text-blue-600 shrink-0" />
            <span className="capitalize">Today is {currentWeekday}</span>
          </div>
        </div>

        {/* 3D Books Illustration Aligned with Left Paragraph */}
        <div className="w-28 sm:w-36 md:w-44 shrink-0 flex items-center justify-end pointer-events-none select-none">
          <img
            src="/images/Books-with-calendar.png"
            alt="Timetable Illustration"
            className="w-full h-auto object-contain filter drop-shadow-md"
          />
        </div>
      </motion.div>

      {/* ─────────────────────────────────────────────────────────────
          2. Weekday Switcher Tabs (Fully Rounded Pills)
         ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-full border border-slate-100 p-1.5 sm:p-2 shadow-2xs">
        <div className="flex items-center justify-between overflow-x-auto no-scrollbar gap-1 sm:gap-2">
          {DAYS_OF_WEEK.map((day) => {
            const isActive = selectedDay.toLowerCase() === day.toLowerCase();
            return (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                type="button"
                className={`flex-1 min-w-[92px] sm:min-w-[110px] py-2 sm:py-2.5 px-3 sm:px-4 rounded-full text-xs sm:text-sm font-bold capitalize transition-all text-center cursor-pointer ${
                  isActive
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. Daily Schedule Content Card (Fully Rounded Corners & 3 per Row on Desktop)
         ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-100 p-5 sm:p-7 shadow-2xs">
        {/* Section Header */}
        <div className="flex items-center justify-between pb-5 border-b border-slate-100 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Calendar size={22} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-800 capitalize">
                {selectedDay} Schedule
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Daily class periods and assigned teachers
              </p>
            </div>
          </div>

          <div className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 px-3.5 py-1.5 rounded-full">
            {activeSlots.length > 0 ? `${activeSlots.length} Periods` : "0 Periods"}
          </div>
        </div>

        {/* Content Body */}
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-center">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin mb-3" />
            <p className="text-xs sm:text-sm font-bold text-slate-500">Loading your timetable...</p>
          </div>
        ) : activeSlots.length === 0 ? (
          /* Empty State matching reference image with empty folder illustration */
          <div className="py-12 sm:py-16 px-4 text-center flex flex-col items-center justify-center select-none">
            <div className="relative mb-4">
              <img
                src="/images/empty-folder.png"
                alt="No lectures"
                className="w-36 sm:w-44 h-auto object-contain mx-auto filter drop-shadow-sm pointer-events-none"
              />
            </div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
              No lectures scheduled for {selectedDay.charAt(0).toUpperCase() + selectedDay.slice(1)}
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 mt-1.5 max-w-sm mx-auto leading-relaxed">
              There are no class periods configured for this day. Check other days or contact the school office.
            </p>
          </div>
        ) : (
          /* Slot Cards with fully rounded corners: 3 in a row on Desktop (grid-cols-1 md:grid-cols-2 lg:grid-cols-3) */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeSlots.map((slot: any, idx: number) => {
              if (slot.is_break) {
                return (
                  <div
                    key={slot.id || idx}
                    className="flex items-center justify-between p-4 sm:p-5 rounded-3xl bg-amber-50/70 border border-amber-200/70 shadow-2xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-100 text-amber-800 rounded-full flex items-center justify-center shrink-0">
                        <Coffee size={18} />
                      </div>
                      <div>
                        <span className="text-xs font-extrabold text-amber-900 uppercase tracking-wider">
                          Recess / Break
                        </span>
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 mt-0.5">
                          <Clock size={13} />
                          <span>{formatTime(slot.slot_start_time)} - {formatTime(slot.slot_end_time)}</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-extrabold px-3 py-1 bg-amber-200/70 text-amber-900 rounded-full uppercase">
                      Break
                    </span>
                  </div>
                );
              }

              return (
                <div
                  key={slot.id || idx}
                  className="flex flex-col justify-between p-4 sm:p-5 rounded-3xl bg-white border border-slate-100 hover:border-blue-200 hover:shadow-xs transition-all gap-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[11px] font-extrabold px-3 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                          Period #{slot.slot_number || idx + 1}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-full">
                          Lecture
                        </span>
                      </div>
                      <h4 className="text-base font-extrabold text-slate-800 capitalize">
                        {slot.subject_name || `Subject #${slot.subject || "-"}`}
                      </h4>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-100 px-3 py-1 rounded-full shrink-0">
                      <Clock size={13} className="text-blue-600" />
                      <span>{formatTime(slot.slot_start_time)} - {formatTime(slot.slot_end_time)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                    <div className="flex items-center gap-2 text-slate-600 font-medium">
                      <UserCheck size={16} className="text-blue-600" />
                      <span>Teacher: <strong className="text-slate-800 font-bold">{slot.teacher_name || "Assigned Teacher"}</strong></span>
                    </div>
                    {slot.room_number && (
                      <span className="text-[11px] text-slate-500 font-semibold bg-slate-50 border border-slate-100 px-2.5 py-0.5 rounded-full">
                        Room {slot.room_number}
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
  );
}
