"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { GraduationCap, Menu, X, LogOut, Bell, ChevronRight, Search, Sparkles, Loader2, Megaphone, Trash2 } from "lucide-react";
import { logoutUser } from "@/lib/auth";
import { useAnnouncementSocket } from "@/hooks/useAnnouncementSocket";
import { type AnnouncementResponse } from "@/lib/principal";

export interface SidebarLink {
  title: string;
  href: string;
  icon: React.ElementType;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  roleTitle: string;
  roleColor?: string;
  sidebarLinks: SidebarLink[];
  userName?: string;
}

const roleConfig: Record<string, { gradient: string; badge: string; badgeText: string }> = {
  "Super Admin": {
    gradient: "from-[#1D496C] via-[#285E89] to-[#429CE4]",
    badge: "bg-[#1D496C]",
    badgeText: "SA",
  },
  Trustee: {
    gradient: "from-[#1D496C] via-[#285E89] to-[#6A7626]",
    badge: "bg-[#285E89]",
    badgeText: "TR",
  },
  Principal: {
    gradient: "from-[#1D496C] via-[#6A7626] to-[#E4FF4C]",
    badge: "bg-[#6A7626]",
    badgeText: "PR",
  },
  Clerk: {
    gradient: "from-[#429CE4] via-[#285E89] to-[#1D496C]",
    badge: "bg-[#429CE4]",
    badgeText: "CL",
  },
  Fees: {
    gradient: "from-[#ED6708] via-[#FFA600] to-[#E4FF4C]",
    badge: "bg-[#ED6708]",
    badgeText: "FE",
  },
  Librarian: {
    gradient: "from-[#6A7626] via-[#E4FF4C] to-[#429CE4]",
    badge: "bg-[#6A7626]",
    badgeText: "LB",
  },
  Inventory: {
    gradient: "from-[#285E89] via-[#429CE4] to-[#E4FF4C]",
    badge: "bg-[#429CE4]",
    badgeText: "IN",
  },
  Applicant: {
    gradient: "from-[#FFA600] via-[#ED6708] to-[#1D496C]",
    badge: "bg-[#FFA600]",
    badgeText: "AP",
  },
};

function SidebarContent({
  roleTitle,
  sidebarLinks,
  pathname,
  onLinkClick,
}: {
  roleTitle: string;
  sidebarLinks: SidebarLink[];
  pathname: string;
  onLinkClick?: () => void;
}) {
  const config = roleConfig[roleTitle] ?? roleConfig["Super Admin"];
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await logoutUser(); // handles redirect internally
  };

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="h-[72px] flex items-center px-5 shrink-0">
        <Link href="/" className="flex items-center gap-3 group w-fit">
          <motion.div
            whileHover={{ rotate: 10, scale: 1.1 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
            className="flex h-14 w-auto items-center justify-center rounded-xl bg-white shadow-lg border border-white/10 p-1.5"
          >
            <img src="/logo.png" alt="VidyaSanchalan Logo" className="h-11 w-auto max-w-[100px] object-contain" />
          </motion.div>
          <div>
            <span className="font-black text-lg tracking-tight text-white leading-none">
              Vidya<span className="text-[#FFA600]">Sanchalan</span>
            </span>
            <p className="text-[10px] text-white/40 font-medium leading-none mt-0.5">School Management</p>
          </div>
        </Link>
      </div>

      {/* Role badge */}
      <div className="px-5 pb-4">
        <div className={`rounded-xl bg-gradient-to-r ${config.gradient} p-px`}>
          <div className="rounded-[11px] bg-[#1e1b4b]/90 backdrop-blur-sm px-4 py-3 flex items-center gap-3">
            <div className={`h-8 w-8 rounded-lg ${config.badge} flex items-center justify-center text-white font-bold text-xs shadow-md shrink-0`}>
              {config.badgeText}
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">Current Role</p>
              <p className="text-sm font-bold text-white leading-tight">{roleTitle}</p>
            </div>
            <Sparkles className="h-3.5 w-3.5 text-white/20 ml-auto" />
          </div>
        </div>
      </div>

      <div className="px-4 mb-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/25 px-2">Navigation</p>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto pb-4">
        {sidebarLinks.map((link, i) => {
          const isActive =
            pathname === link.href ||
            (pathname.startsWith(`${link.href}/`) &&
              link.href !== "/" &&
              !sidebarLinks.some(
                (other) =>
                  other.href !== link.href &&
                  pathname.startsWith(other.href) &&
                  other.href.length > link.href.length
              ));
          return (
            <motion.div
              key={link.href}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06, duration: 0.3 }}
            >
              <Link
                href={link.href}
                onClick={onLinkClick}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group overflow-hidden ${
                  isActive
                    ? "text-white"
                    : "text-white/50 hover:text-white/90 hover:bg-white/5"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeNavBg"
                    className={`absolute inset-0 bg-gradient-to-r ${config.gradient} rounded-xl opacity-90`}
                    transition={{ type: "spring", stiffness: 400, damping: 35 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-3 w-full">
                  <span className={`flex items-center justify-center h-7 w-7 rounded-lg transition-colors shrink-0 ${isActive ? "bg-white/20" : "bg-white/5 group-hover:bg-white/10"}`}>
                    <link.icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="flex-1">{link.title}</span>
                  {isActive && (
                    <ChevronRight className="h-3.5 w-3.5 text-white/60 shrink-0" />
                  )}
                </span>
              </Link>
            </motion.div>
          );
        })}
      </nav>

      {/* Sign Out */}
      <div className="p-4 border-t border-white/5 shrink-0">
        <motion.button
          whileHover={{ x: 2 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/40 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200 group disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <span className="flex items-center justify-center h-7 w-7 rounded-lg bg-white/5 group-hover:bg-red-500/10 transition-colors shrink-0">
            {isSigningOut
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <LogOut className="h-3.5 w-3.5" />}
          </span>
          {isSigningOut ? "Signing out…" : "Sign Out"}
        </motion.button>
      </div>
    </div>
  );
}

export function DashboardLayout({
  children,
  roleTitle,
  sidebarLinks,
  userName = "Admin",
}: DashboardLayoutProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (target && target.closest && target.closest("#notification-detail-modal")) {
        return;
      }
      if (bellRef.current && !bellRef.current.contains(target)) {
        setBellOpen(false);
      }
    }
    if (bellOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [bellOpen]);
  const [selectedNotification, setSelectedNotification] = useState<AnnouncementResponse | null>(null);
  const { notifications, readIds, unreadCount, markAsRead } = useAnnouncementSocket();
  const config = roleConfig[roleTitle] ?? roleConfig["Super Admin"];
  const activeTitle =
    sidebarLinks.find(
      (l) =>
        pathname === l.href ||
        (pathname.startsWith(`${l.href}/`) &&
          l.href !== "/" &&
          !sidebarLinks.some(
            (other) =>
              other.href !== l.href &&
              pathname.startsWith(other.href) &&
              other.href.length > l.href.length
          ))
    )?.title || roleTitle;

  return (
    <div className="flex h-svh w-full overflow-hidden bg-[#f1f5f9]">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex w-64 flex-col bg-gradient-to-b from-[#1D496C] via-[#122F45] to-[#0F1E2C] text-white relative overflow-hidden shrink-0`}
      >
        {/* Decorative glow blobs */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-20 -left-20 h-64 w-64 rounded-full bg-[#429CE4]/20 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-48 w-48 rounded-full bg-[#6A7626]/15 blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col h-full">
          <SidebarContent
            roleTitle={roleTitle}
            sidebarLinks={sidebarLinks}
            pathname={pathname}
          />
        </div>
      </aside>

      {/* Main area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-[72px] bg-white/80 backdrop-blur-md border-b border-slate-200/60 flex items-center justify-between px-4 lg:px-6 shrink-0 relative z-10">
          {/* Left */}
          <div className="flex items-center gap-3">
            <motion.button
              whileTap={{ scale: 0.93 }}
              className="lg:hidden p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </motion.button>

            {/* Breadcrumb */}
            <div className="hidden sm:flex items-center gap-2 text-sm">
              <span className="text-slate-400 font-medium">{roleTitle}</span>
              <ChevronRight className="h-4 w-4 text-slate-300" />
              <span className="font-semibold text-slate-800">{activeTitle}</span>
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-2">
            {/* Search */}
            <motion.div
              whileFocus={{ width: 220 }}
              className="hidden md:flex items-center gap-2 bg-slate-100 hover:bg-slate-50 border border-transparent hover:border-slate-200 rounded-xl px-3 py-2 transition-all duration-200 w-48 group"
            >
              <Search className="h-4 w-4 text-slate-400 group-hover:text-slate-500 transition-colors shrink-0" />
              <span className="text-sm text-slate-400 flex-1">Quick search…</span>
              <kbd className="hidden group-hover:inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold text-slate-400 bg-slate-200 rounded border border-slate-300">⌘K</kbd>
            </motion.div>

            {/* Notification Bell */}
            <div ref={bellRef} className="relative">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setBellOpen(!bellOpen);
                }}
                className={`relative p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-all ${
                  bellOpen ? "bg-slate-200 text-slate-800" : ""
                }`}
              >
                <Bell className="h-4.5 w-4.5" />
                {unreadCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 border-2 border-white flex items-center justify-center text-[10px] font-black text-white shadow-sm"
                  >
                    {unreadCount}
                  </motion.span>
                )}
              </motion.button>

              <AnimatePresence>
                {bellOpen && (
                  <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 overflow-hidden"
                    >
                      <div className="p-4 border-b border-slate-150/60 flex items-center justify-between bg-slate-50/50">
                        <span className="font-bold text-slate-800 flex items-center gap-1.5 text-sm">
                          <Bell className="h-4 w-4 text-indigo-500" />
                          Notifications
                          {unreadCount > 0 && (
                            <span className="text-[10px] font-bold bg-red-500 text-white px-2 py-0.5 rounded-full">
                              {unreadCount} new
                            </span>
                          )}
                        </span>

                      </div>

                      <div className="max-h-72 overflow-y-auto divide-y divide-slate-150/40">
                        {notifications.length === 0 ? (
                          <div className="p-8 text-center text-slate-400">
                            <Megaphone className="h-8 w-8 mx-auto mb-2 text-slate-350 stroke-[1.5]" />
                            <p className="text-sm font-semibold">No announcements yet</p>
                            <p className="text-xs text-slate-400 mt-0.5">We'll alert you when a new notice is sent.</p>
                          </div>
                        ) : (
                          [...notifications]
                            .sort((a, b) => {
                              const aRead = readIds.includes(a.id);
                              const bRead = readIds.includes(b.id);
                              if (aRead !== bRead) return aRead ? 1 : -1;
                              return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
                            })
                            .map((n) => {
                              const isRead = readIds.includes(n.id);
                              return (
                                <div
                                  key={n.id}
                                  onClick={() => {
                                    setSelectedNotification(n);
                                    markAsRead(n.id);
                                  }}
                                className={`p-4 hover:bg-slate-50/80 cursor-pointer transition-colors flex gap-3 ${
                                  !isRead ? "bg-indigo-50/15" : ""
                                }`}
                              >
                                <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                                  !isRead ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-500"
                                }`}>
                                  <Megaphone className="h-4 w-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-1">
                                    <p className={`text-xs truncate ${!isRead ? "font-black text-slate-900" : "font-medium text-slate-600"}`}>
                                      {n.title}
                                    </p>
                                    {!isRead && (
                                      <span className="h-2 w-2 rounded-full bg-indigo-600 shrink-0" />
                                    )}
                                  </div>
                                  <p className={`text-xs mt-0.5 line-clamp-2 ${!isRead ? "text-slate-600 font-medium" : "text-slate-500"}`} title={n.description}>
                                    {n.description}
                                  </p>
                                  <p className="text-[10px] text-slate-400 mt-1.5">
                                    {new Date(n.created_at).toLocaleDateString("en-IN", {
                                      day: "2-digit",
                                      month: "short",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </p>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Divider */}
            <div className="h-8 w-px bg-slate-200 mx-1" />

            {/* User Avatar */}
            <motion.div
              whileHover={{ scale: 1.03 }}
              className="flex items-center gap-2.5 cursor-pointer group bg-slate-50 hover:bg-slate-100 border border-slate-200/60 rounded-xl px-2.5 pr-3.5 py-1.5 transition-all"
            >
              <div className={`h-7 w-7 rounded-lg bg-gradient-to-tr ${config.gradient} flex items-center justify-center text-white font-bold text-xs shadow-sm`}>
                {config.badgeText}
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-semibold text-slate-700 leading-tight">{userName}</p>
                <p className="text-[10px] text-slate-400 leading-tight">{roleTitle}</p>
              </div>
            </motion.div>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
              className="h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 340, damping: 30 }}
              className="fixed inset-y-0 left-0 w-72 bg-gradient-to-b from-[#1D496C] via-[#122F45] to-[#0F1E2C] text-white flex flex-col z-50 lg:hidden overflow-hidden"
            >
              {/* Blobs */}
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute -top-20 -left-20 h-64 w-64 rounded-full bg-[#429CE4]/20 blur-3xl" />
                <div className="absolute bottom-0 right-0 h-48 w-48 rounded-full bg-[#6A7626]/15 blur-3xl" />
              </div>

              {/* Close button */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setSidebarOpen(false)}
                className="absolute top-4 right-4 z-50 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all"
              >
                <X className="h-4 w-4" />
              </motion.button>

              <div className="relative z-10 flex flex-col h-full">
                <SidebarContent
                  roleTitle={roleTitle}
                  sidebarLinks={sidebarLinks}
                  pathname={pathname}
                  onLinkClick={() => setSidebarOpen(false)}
                />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* View Announcement Detail Modal */}
      <AnimatePresence>
        {selectedNotification && (
          <div id="notification-detail-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/45 backdrop-blur-sm"
              onClick={() => setSelectedNotification(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 z-10 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                  <Megaphone className="h-5 w-5 text-indigo-600" />
                  Announcement Detail
                </h3>
                <button
                  onClick={() => setSelectedNotification(null)}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={18} className="text-gray-500" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider text-[10px]">Title</h4>
                  <p className="text-base font-black text-gray-800 mt-1">{selectedNotification.title}</p>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider text-[10px]">Description</h4>
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 mt-1 max-h-60 overflow-y-auto">
                    <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                      {selectedNotification.description}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                  <div>
                    <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider text-[10px]">Target Audience</h4>
                    <span className="inline-flex items-center text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-full mt-1.5">
                      {selectedNotification.announcement_for ?? "ALL"}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider text-[10px]">Broadcast</h4>
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full mt-1.5 ${
                      String(selectedNotification.is_everyone) === "true"
                        ? "text-emerald-700 bg-emerald-50 border border-emerald-100"
                        : "text-slate-500 bg-slate-50 border border-slate-200"
                    }`}>
                      {String(selectedNotification.is_everyone) === "true" ? "Yes" : "No"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider text-[10px]">Published Date</h4>
                    <p className="text-xs text-gray-600 font-medium mt-1">
                      {new Date(selectedNotification.created_at).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider text-[10px]">Expires Date</h4>
                    <p className={`text-xs font-medium mt-1 ${
                      selectedNotification.expires_at && new Date(selectedNotification.expires_at).getTime() < Date.now()
                        ? "text-red-650 font-bold"
                        : "text-gray-600"
                    }`}>
                      {selectedNotification.expires_at
                        ? new Date(selectedNotification.expires_at).toLocaleString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Never"}
                      {selectedNotification.expires_at && new Date(selectedNotification.expires_at).getTime() < Date.now() && " (Expired)"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setSelectedNotification(null)}
                  className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-all"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
