"use client";

import React, { useState } from "react";
import {
  Bell,
  RefreshCw,
  Trash2,
  CheckCheck,
  Check,
  CalendarCheck,
  CalendarDays,
  Banknote,
  Megaphone,
  Clock,
  Sparkles,
  AlertTriangle,
  Flame,
  User,
  X,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAnnouncementSocket } from "@/hooks/useAnnouncementSocket";
import { AnnouncementResponse } from "@/lib/principal";

export interface NotificationsHubProps {
  roleTitle?: string;
  pageTitle?: string;
  pageSubtitle?: string;
}

export function NotificationsHub({
  pageTitle = "Notifications",
  pageSubtitle,
}: NotificationsHubProps) {
  const {
    notifications,
    readIds,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    refresh,
  } = useAnnouncementSocket();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<AnnouncementResponse | null>(null);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (refresh) {
        await refresh();
      }
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const getNotificationCategory = (item: AnnouncementResponse): string => {
    const text = `${item.title} ${item.description}`.toLowerCase();
    if (text.includes("leave") || text.includes("absent") || text.includes("attendance")) return "LEAVES";
    if (text.includes("payslip") || text.includes("salary") || text.includes("payroll")) return "SALARY";
    if (text.includes("event") || text.includes("holiday") || text.includes("exam")) return "EVENTS";
    if (item.target_user) return "DIRECT";
    return "ANNOUNCEMENTS";
  };

  const getCategoryMeta = (category: string) => {
    switch (category) {
      case "LEAVES":
        return { label: "Leave & Attendance", icon: CalendarCheck, color: "text-emerald-700 bg-emerald-50 border-emerald-200" };
      case "SALARY":
        return { label: "Payroll", icon: Banknote, color: "text-indigo-700 bg-indigo-50 border-indigo-200" };
      case "EVENTS":
        return { label: "Event", icon: CalendarDays, color: "text-purple-700 bg-purple-50 border-purple-200" };
      case "DIRECT":
        return { label: "Personal", icon: Sparkles, color: "text-blue-700 bg-blue-50 border-blue-200" };
      default:
        return { label: "Notice", icon: Megaphone, color: "text-slate-700 bg-slate-100 border-slate-200" };
    }
  };

  return (
    <div className="space-y-3 sm:space-y-4 max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-3 sm:py-4.5 pb-3 sm:pb-5 lg:pb-8 w-full min-w-0 overflow-x-hidden font-sans">
      {/* ─── Compact Header Action Bar ──────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-white border border-slate-200/90 shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-blue-50 text-[#2563EB] flex items-center justify-center shrink-0 border border-blue-100 shadow-2xs">
            <Bell className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-xl font-black text-slate-900 tracking-tight">
                {pageTitle}
              </h1>
              {unreadCount > 0 ? (
                <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] sm:text-[11px] font-black shadow-xs shrink-0">
                  {unreadCount} new
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] sm:text-[11px] font-semibold border border-slate-200 shrink-0">
                  {notifications.length} total
                </span>
              )}
            </div>
            {pageSubtitle && (
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                {pageSubtitle}
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons: Mark All Read, Refresh, Clear */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 self-start sm:self-center pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 w-full sm:w-auto justify-end">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => markAllAsRead()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[11px] sm:text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer"
              title="Mark all as read"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark all read</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center justify-center h-8 sm:h-9 w-8 sm:w-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs active:scale-95 transition-all cursor-pointer disabled:opacity-60 shrink-0"
            title="Refresh notifications"
            aria-label="Refresh notifications"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-[#2563EB]" : "text-slate-600"}`} />
          </button>

          {notifications.length > 0 && (
            <button
              type="button"
              onClick={() => clearNotifications()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-600 text-[11px] sm:text-xs font-semibold shadow-2xs active:scale-95 transition-all cursor-pointer"
              title="Clear all notifications"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── Notification List ────────────────────────────────────── */}
      <div className="space-y-2">
        {notifications.length > 0 ? (
          notifications.map((item) => {
            const isRead = readIds.some((rId) => String(rId) === String(item.id));
            const priority = (item.priority || "NORMAL").toUpperCase();
            const category = getNotificationCategory(item);
            const catMeta = getCategoryMeta(category);
            const CategoryIcon = catMeta.icon;

            return (
              <div
                key={item.id}
                onClick={() => {
                  setSelectedNotification(item);
                  markAsRead(item.id);
                }}
                className={`group relative rounded-2xl border p-3.5 sm:p-4 transition-all duration-150 cursor-pointer ${
                  !isRead
                    ? "bg-gradient-to-r from-blue-50/70 via-white to-white border-blue-200/90 shadow-xs hover:border-blue-300 hover:shadow-sm"
                    : "bg-white border-slate-200/80 shadow-2xs hover:border-slate-300"
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Category / Notice Icon Avatar */}
                  <div
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                      !isRead
                        ? "bg-blue-100/90 border-blue-200 text-[#2563EB]"
                        : "bg-slate-100 border-slate-200 text-slate-500"
                    }`}
                  >
                    <CategoryIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>

                  {/* Body Content */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-1.5 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Priority Badge */}
                        {priority === "URGENT" && (
                          <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 text-[10px] font-bold border border-rose-200 inline-flex items-center gap-1">
                            <Flame className="w-3 h-3 text-rose-600" />
                            URGENT
                          </span>
                        )}
                        {priority === "IMPORTANT" && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-200 inline-flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            IMPORTANT
                          </span>
                        )}

                        {/* Category Chip */}
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium border ${catMeta.color}`}>
                          {catMeta.label}
                        </span>

                        {/* Target badge */}
                        {item.target_user && (
                          <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 text-[10px] font-bold border border-purple-200">
                            Personal
                          </span>
                        )}
                      </div>

                      {/* Timestamp */}
                      <span className="text-[10px] sm:text-[11px] text-slate-400 flex items-center gap-1 shrink-0">
                        <Clock className="w-3 h-3" />
                        {new Date(item.created_at).toLocaleString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    {/* Notification Title */}
                    <h3 className={`text-sm sm:text-base leading-snug flex items-center gap-1.5 ${
                      !isRead ? "font-bold text-slate-900" : "font-semibold text-slate-800"
                    }`}>
                      {!isRead && (
                        <span className="w-2 h-2 rounded-full bg-[#2563EB] shrink-0" />
                      )}
                      <span className="truncate">{item.title}</span>
                    </h3>

                    {/* Description preview */}
                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                      {item.description}
                    </p>

                    {/* Footer Info */}
                    <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                      <span className="truncate flex items-center gap-1 text-[10.5px]">
                        <User className="w-3 h-3 text-slate-400" />
                        <span className="font-semibold text-slate-700">{item.created_by_name || "Administration"}</span>
                      </span>

                      <div className="flex items-center gap-2">
                        {!isRead ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(item.id);
                            }}
                            className="text-[11px] font-bold text-[#2563EB] hover:underline px-2 py-0.5 rounded-md hover:bg-blue-50"
                          >
                            Mark read
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Check className="w-3 h-3 text-slate-400" /> Read
                          </span>
                        )}
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-8 sm:p-12 text-center bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-2.5">
            <div className="w-12 h-12 mx-auto rounded-full bg-blue-50 text-[#2563EB] flex items-center justify-center border border-blue-100">
              <Bell className="w-6 h-6 stroke-[1.8]" />
            </div>
            <h4 className="text-base font-bold text-slate-800">No notifications yet</h4>
            <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
              You are completely caught up! New notices and alerts will appear here automatically.
            </p>
          </div>
        )}
      </div>

      {/* ─── Notification Detail Modal ────────────────────────────── */}
      <AnimatePresence>
        {selectedNotification && (
          <div
            id="notification-hub-detail-modal"
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
            onClick={() => setSelectedNotification(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white p-5 sm:p-6 shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center border border-blue-100">
                    <Bell className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 leading-tight">
                      Notice Details
                    </h3>
                    <span className="text-[11px] text-slate-400">
                      Official Institutional Notification
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedNotification(null)}
                  className="rounded-xl p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-3.5 overflow-y-auto py-3 pr-1">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-md bg-blue-100 text-[#2563EB] text-[10px] font-bold">
                      {selectedNotification.priority || "NORMAL"}
                    </span>
                    {selectedNotification.target_user && (
                      <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 text-[10px] font-bold">
                        Personal Target
                      </span>
                    )}
                  </div>
                  <h4 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                    {selectedNotification.title}
                  </h4>
                </div>

                <div className="rounded-2xl bg-slate-50 p-3.5 sm:p-4 border border-slate-200/70 max-h-60 overflow-y-auto">
                  <p className="whitespace-pre-line text-xs sm:text-sm text-slate-700 leading-relaxed font-normal">
                    {selectedNotification.description}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                      Sender
                    </span>
                    <span className="font-semibold text-slate-800 block truncate">
                      {selectedNotification.created_by_name || "Administration"}
                    </span>
                    <span className="text-[10px] text-slate-500 block truncate">
                      {selectedNotification.created_by_role || "School Staff"}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                      Date & Time
                    </span>
                    <span className="font-semibold text-slate-800 block">
                      {new Date(selectedNotification.created_at).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {new Date(selectedNotification.created_at).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedNotification(null)}
                  className="rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-bold px-5 py-2 text-xs shadow-xs"
                >
                  Close Notice
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
