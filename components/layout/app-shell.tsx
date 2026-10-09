"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Bell, ChevronDown, Loader2, LogOut, Megaphone, Menu, School, X } from "lucide-react";
import { logoutUser, getDashboardRoute } from "@/lib/auth";
import { useAnnouncementSocket } from "@/hooks/useAnnouncementSocket";
import { type AnnouncementResponse } from "@/lib/principal";
import { getCurrentUserProfile } from "@/lib/current-user";
import { ProfileDialog } from "@/components/profile/profile-dialog";
import { TrialBanner } from "@/components/subscription/TrialBanner";
import type { CurrentUserProfile } from "@/types";

export interface SidebarLink {
  title: string;
  href: string;
  icon: React.ElementType;
  exact?: boolean;
  subLinks?: SidebarLink[];
}

export interface AppShellProps {
  children: React.ReactNode;
  links: SidebarLink[];
  /** Rendered as the sidebar subtitle and the header sub-label. */
  roleTitle?: string;
  /** Fallback name shown in the header before the real profile resolves. */
  userName?: string;
  /** Replaces the "Sign out" footer action (used by the CMS admin panel). */
  onSignOut?: () => void;
}

const MIN_WIDTH = 72;
const MAX_WIDTH = 320;
const EXPANDED_MIN = 224;
const COMPACT_MAX = 160;
const DEFAULT_WIDTH = 248;

const ROLE_ALLOWED_MAP: Record<string, string[]> = {
  "Super Admin": ["super_admin", "superadmin"],
  Trustee: ["admin(trustee)", "trustee", "super_admin", "superadmin"],
  Principal: ["principal", "super_admin", "superadmin"],
  Clerk: ["clerk", "fees_clerk", "principal", "super_admin", "superadmin"],
  Teacher: ["teacher", "principal", "super_admin", "superadmin"],
  Librarian: ["librarian", "principal", "super_admin", "superadmin"],
  Inventory: ["inventory", "principal", "super_admin", "superadmin"],
  Fees: ["fees management", "fees", "fees_clerk", "clerk", "principal", "super_admin", "superadmin"],
  Student: ["student", "principal", "super_admin", "superadmin"],
  Parent: ["parents", "parent", "principal", "super_admin", "superadmin"],
  Applicant: ["temp_user", "user", "super_admin", "superadmin"],
};

function clampWidth(width: number) {
  return Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, width));
}

function settleWidth(width: number) {
  return width < COMPACT_MAX ? MIN_WIDTH : Math.max(EXPANDED_MIN, width);
}

/** Finds the deepest link matching the current path so nested groups resolve. */
function findActive(links: SidebarLink[], pathname: string): SidebarLink | undefined {
  const leaves = links.flatMap(link => link.subLinks?.length ? link.subLinks : [link]);
  return leaves.filter(link => pathname === link.href || (!link.exact && link !== links[0] && pathname.startsWith(`${link.href}/`)))
    .sort((a, b) => b.href.length - a.href.length)[0];
}

export function AppShell({ children, links, roleTitle, userName, onSignOut }: AppShellProps) {
  const pathname = usePathname();
  const [authorizedPath, setAuthorizedPath] = useState<string | null>(null);
  const requiresRoleCheck = !onSignOut && !!roleTitle && !!ROLE_ALLOWED_MAP[roleTitle];

  useEffect(() => {
    if (!requiresRoleCheck) return;
    try {
      const token = localStorage.getItem("access_token") || document.cookie.split("; ").some(row => row.startsWith("access_token="));
      if (!token) {
        window.location.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
        return;
      }
      const roles: unknown = JSON.parse(localStorage.getItem("roles") || "[]");
      if (!Array.isArray(roles)) throw new Error("Invalid stored roles");
      const normalized = roles.map(role => String(role).toLowerCase().trim());
      if (!ROLE_ALLOWED_MAP[roleTitle!].some(role => normalized.includes(role))) {
        const route = getDashboardRoute(roles);
        window.location.replace(route && route !== pathname ? route : "/login");
        return;
      }
      setAuthorizedPath(pathname);
    } catch {
      window.location.replace("/login");
    }
  }, [pathname, roleTitle, requiresRoleCheck]);
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_WIDTH);
  const [resizing, setResizing] = useState(false);
  const dragStart = useRef<{ x: number; width: number } | null>(null);
  const expanded = sidebarWidth >= COMPACT_MAX;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const { notifications, readIds, unreadCount, markAsRead } = useAnnouncementSocket();
  const [profile, setProfile] = useState<CurrentUserProfile | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<AnnouncementResponse | null>(null);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    getCurrentUserProfile()
      .then((data) => { if (mounted) setProfile(data); })
      .catch(() => { /* keep the static fallback label */ });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    try { setSchoolName(localStorage.getItem("school_name")); } catch { /* ignore */ }
  }, []);

  // Auto-expand the group that owns the active page.
  useEffect(() => {
    const active = findActive(links, pathname);
    const owner = links.find(link => active && link.subLinks?.includes(active));
    if (owner) setOpenGroup(owner.title);
  }, [pathname, links]);

  const updateWidth = useCallback((width: number) => {
    const next = clampWidth(width);
    setSidebarWidth(next);
  }, []);

  const resizeSidebar = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragStart.current) return;
    setSidebarWidth(clampWidth(dragStart.current.width + event.clientX - dragStart.current.x));
  };
  const finishResize = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragStart.current) return;
    const width = clampWidth(dragStart.current.width + event.clientX - dragStart.current.x);
    updateWidth(settleWidth(width));
    dragStart.current = null;
    setResizing(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const cancelResize = () => {
    if (!dragStart.current) return;
    dragStart.current = null;
    setResizing(false);
    setSidebarWidth(width => settleWidth(width));
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
        setNotificationsOpen(false);
        setSelectedNotification(null);
      }
    };
    const outside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target?.closest?.("#notification-detail-modal")) return;
      if (!notificationRef.current?.contains(target)) setNotificationsOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", outside);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", outside);
    };
  }, []);

  const signOut = async () => {
    if (onSignOut) { onSignOut(); return; }
    setSigningOut(true);
    try { await logoutUser(); } finally { setSigningOut(false); }
  };

  const subtitle = roleTitle || "Clerk";
  const activeLink = findActive(links, pathname);

  const getBadgeColor = (title: string, index: number) => {
    const lower = title.toLowerCase().trim();
    if (lower.includes("dashboard")) return "bg-indigo-500 text-white";
    if (lower.includes("generate salary") || lower.includes("generate-salary")) return "bg-[#f43f5e] text-white";
    if (lower.includes("salary component") || lower.includes("component")) return "bg-[#10b981] text-white";
    if (lower.includes("staff salary")) return "bg-[#f97316] text-white";
    if (lower.includes("certificate") || lower.includes("g.r.") || lower.includes("award") || lower.includes("docs")) return "bg-[#fbbf24] text-white";
    if (lower.includes("hr") || lower.includes("staff") || lower.includes("department")) return "bg-[#06b6d4] text-white";
    if (lower.includes("admission") || lower.includes("applicant") || lower.includes("student directory") || lower.includes("students")) return "bg-[#f43f5e] text-white";
    if (lower.includes("academic year")) return "bg-[#3b82f6] text-white";
    if (lower.includes("fee type")) return "bg-[#ec4899] text-white";
    if (lower.includes("fee structure")) return "bg-[#8b5cf6] text-white";
    if (lower.includes("generate fee") || lower.includes("genrate fee")) return "bg-[#10b981] text-white";
    if (lower.includes("student ledger") || lower.includes("ledger") || lower.includes("receipt")) return "bg-[#f97316] text-white";
    if (lower.includes("division")) return "bg-[#818cf8] text-white";
    if (lower.includes("categorie")) return "bg-[#fbbf24] text-white";
    if (lower.includes("school") || lower.includes("class") || lower.includes("profile")) return "bg-[#38bdf8] text-white";
    if (lower.includes("attendance")) return "bg-[#22c55e] text-white";
    if (lower.includes("curriculum") || lower.includes("subject") || lower.includes("syllabus")) return "bg-[#818cf8] text-white";
    if (lower.includes("teacher") || lower.includes("faculty") || lower.includes("workload")) return "bg-[#f97316] text-white";
    if (lower.includes("timetable") || lower.includes("schedule")) return "bg-[#06b6d4] text-white";
    if (lower.includes("announcement") || lower.includes("notice")) return "bg-[#ec4899] text-white";
    if (lower.includes("leave request")) return "bg-[#84cc16] text-white";
    if (lower.includes("my leave") || lower.includes("leave")) return "bg-[#fb7185] text-white";
    if (lower.includes("fee") || lower.includes("payment")) return "bg-[#10b981] text-white";
    if (lower.includes("inventory") || lower.includes("stock") || lower.includes("asset")) return "bg-[#a855f7] text-white";
    if (lower.includes("librar") || lower.includes("book")) return "bg-[#eab308] text-white";
    if (lower.includes("exam") || lower.includes("result") || lower.includes("mark")) return "bg-[#e11d48] text-white";
    if (lower.includes("homework") || lower.includes("assignment")) return "bg-[#06b6d4] text-white";
    if (lower.includes("setting") || lower.includes("config")) return "bg-[#64748b] text-white";

    const palette = [
      "bg-[#06b6d4] text-white", // Cyan
      "bg-[#10b981] text-white", // Emerald
      "bg-[#f97316] text-white", // Orange
      "bg-[#f43f5e] text-white", // Rose
      "bg-[#8b5cf6] text-white", // Purple
      "bg-[#38bdf8] text-white", // Sky
      "bg-[#fbbf24] text-white", // Amber
      "bg-[#22c55e] text-white", // Green
      "bg-[#ec4899] text-white", // Pink
      "bg-[#6366f1] text-white", // Indigo
    ];
    return palette[index % palette.length];
  };

  const navItem = (link: SidebarLink, compact: boolean, index: number, onNavigate?: () => void) => {
    const selected = link === activeLink;
    const isParentOfActive = Boolean(link.subLinks?.some(sub => sub === activeLink));
    const Icon = link.icon;
    const badgeColor = getBadgeColor(link.title, index);

    const base = `group flex h-11 w-full items-center rounded-2xl text-xs sm:text-sm font-medium transition-all duration-200 ${
      compact ? "justify-center px-0" : "gap-3 px-3.5"
    }`;
    
    // Active item has white card style with deep indigo text
    const tone = selected
      ? "bg-white text-indigo-950 font-bold shadow-md shadow-indigo-950/20"
      : "text-white/85 hover:bg-white/10 hover:text-white";

    if (link.subLinks?.length) {
      const groupOpen = !compact && openGroup === link.title;
      const childClasses = (active: boolean) =>
        `flex min-h-9 items-center gap-2.5 rounded-xl px-3 py-1.5 text-xs font-medium leading-5 transition-all ${
          active
            ? "bg-white/20 text-white font-bold shadow-2xs backdrop-blur-xs"
            : "text-purple-100/80 hover:bg-white/10 hover:text-white"
        }`;

      return (
        <div key={link.href} className="space-y-1">
          <button
            type="button"
            onClick={() => {
              if (compact) updateWidth(DEFAULT_WIDTH);
              setOpenGroup(groupOpen ? null : link.title);
            }}
            title={compact ? link.title : undefined}
            aria-label={compact ? link.title : undefined}
            aria-expanded={compact ? undefined : groupOpen}
            className={`${base} ${isParentOfActive && !selected ? "text-white font-semibold bg-white/10" : tone}`}
          >
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg shadow-2xs ${badgeColor}`}>
              <Icon className="h-4 w-4" />
            </span>
            {!compact && (
              <>
                <span className="flex-1 text-left truncate">{link.title}</span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-white/70 transition-transform duration-200 ${
                    groupOpen ? "rotate-180 text-white" : ""
                  }`}
                />
              </>
            )}
          </button>
          {!compact && (
            <AnimatePresence initial={false}>
              {groupOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="overflow-hidden"
                >
                  <div className="ml-5 space-y-1 border-l border-white/20 py-1 pl-3 pr-1">
                    {link.subLinks.map((sub, sIdx) => {
                      const subActive = sub === activeLink;
                      const SubIcon = sub.icon;
                      const subBadgeColor = getBadgeColor(sub.title, sIdx);
                      return (
                        <Link
                          key={`${sub.href}-${sub.title}`}
                          href={sub.href}
                          onClick={onNavigate}
                          aria-current={subActive ? "page" : undefined}
                          className={childClasses(subActive)}
                        >
                          <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] ${subBadgeColor} opacity-90`}>
                            <SubIcon aria-hidden="true" className="h-3 w-3" />
                          </span>
                          <span className="min-w-0 truncate">{sub.title}</span>
                        </Link>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      );
    }

    return (
      <Link
        key={link.href}
        href={link.href}
        title={compact ? link.title : undefined}
        aria-label={compact ? link.title : undefined}
        aria-current={selected ? "page" : undefined}
        onClick={onNavigate}
        className={`${base} ${tone}`}
      >
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg shadow-2xs ${badgeColor}`}>
          <Icon className="h-4 w-4" />
        </span>
        {!compact && <span className="truncate">{link.title}</span>}
      </Link>
    );
  };

  const navigation = (compact: boolean, onNavigate?: () => void) => (
    <div className="flex h-full flex-col relative z-10">
      {/* Brand Header */}
      <div className={`flex h-16 shrink-0 items-center ${compact ? "justify-center" : "gap-3 px-5 pt-3"}`}>
        <button
          type="button"
          aria-label={expanded ? "Collapse navigation" : "Expand navigation"}
          onClick={() => updateWidth(expanded ? MIN_WIDTH : DEFAULT_WIDTH)}
          className="shrink-0 rounded-2xl focus-visible:outline-2 focus-visible:outline-white transition-transform active:scale-95"
        >
          <div className="h-10 w-10 rounded-2xl bg-white/15 backdrop-blur-md p-1.5 flex items-center justify-center shadow-inner border border-white/20">
            <School className="h-6 w-6 text-amber-300 drop-shadow-sm" />
          </div>
        </button>
        {!compact && (
          <div className="min-w-0">
            <p className="truncate text-base font-bold tracking-tight text-white drop-shadow-xs">VidyaSanchalan</p>
            <p className="truncate text-xs text-purple-200/90 font-medium">{subtitle}</p>
          </div>
        )}
      </div>

      {/* Section Label */}
      {!compact && (
        <p className="px-6 pb-2 pt-6 text-[11px] font-bold uppercase tracking-widest text-purple-200/60">
          WORKSPACE
        </p>
      )}

      {/* Nav List */}
      <nav className={`flex-1 space-y-1.5 overflow-y-auto no-scrollbar px-3 py-2 ${compact ? "pt-6" : ""}`} aria-label={`${subtitle} navigation`}>
        {links.map((link, idx) => navItem(link, compact, idx, onNavigate))}
      </nav>

      {/* Sign Out Footer */}
      <div className="p-3">
        <button
          type="button"
          onClick={signOut}
          disabled={signingOut}
          title={compact ? (signingOut ? "Signing out…" : "Sign out") : undefined}
          aria-label="Sign out"
          className={`flex h-11 w-full items-center rounded-2xl text-xs sm:text-sm font-medium text-purple-100 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50 ${
            compact ? "justify-center" : "gap-3 px-3.5"
          }`}
        >
          {signingOut ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogOut className="h-5 w-5" />}
          {!compact && <span>{signingOut ? "Signing out…" : "Sign out"}</span>}
        </button>
      </div>
    </div>
  );

  const sortedNotifications = [...notifications].sort((a, b) => {
    const aRead = readIds.includes(a.id);
    const bRead = readIds.includes(b.id);
    if (aRead !== bRead) return aRead ? 1 : -1;
    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
  });

  if (requiresRoleCheck && authorizedPath !== pathname) {
    return (
      <div className="flex h-svh items-center justify-center bg-[#f4f6fb] text-indigo-900 font-semibold">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-indigo-600" /> Checking access…
      </div>
    );
  }

  const currentSchoolDisplayName = profile?.school?.name || schoolName || "jujutsu kaisen";
  const currentUserName = profile?.name || userName || "gojo";
  const userInitials = profile?.initials || currentUserName.slice(0, 2).toUpperCase() || "GO";

  return (
    <div
      data-resizing={resizing}
      className={`app-workspace flex h-screen w-full overflow-hidden bg-[#f4f6fb] text-slate-900 ${
        resizing ? "cursor-col-resize select-none" : ""
      }`}
    >
      {/* Desktop Gradient Sidebar */}
      <motion.aside
        id="app-desktop-sidebar"
        animate={{ width: sidebarWidth }}
        initial={false}
        transition={{ duration: reducedMotion || resizing ? 0 : 0.15 }}
        className="workspace-navigation relative hidden h-full shrink-0 flex-col bg-gradient-to-b from-[#4f46e5] via-[#4338ca] to-[#312e81] shadow-xl lg:flex overflow-hidden"
      >
        {/* Subtle Ambient Light Highlights */}
        <div className="pointer-events-none absolute -top-24 -left-24 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute bottom-0 -right-24 h-56 w-56 rounded-full bg-indigo-900/40 blur-3xl" />
        
        <div className="flex h-full min-w-0 flex-col overflow-hidden relative z-10">
          {navigation(!expanded)}
        </div>

        {/* Resizer Handle */}
        <div
          role="separator"
          aria-label="Resize sidebar: drag left to collapse or right to expand"
          aria-orientation="vertical"
          aria-valuemin={MIN_WIDTH}
          aria-valuemax={MAX_WIDTH}
          aria-valuenow={sidebarWidth}
          aria-controls="app-desktop-sidebar"
          tabIndex={0}
          title="Drag left to collapse · drag right to expand"
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            event.preventDefault();
            dragStart.current = { x: event.clientX, width: sidebarWidth };
            event.currentTarget.setPointerCapture(event.pointerId);
            setResizing(true);
          }}
          onPointerMove={resizeSidebar}
          onPointerUp={finishResize}
          onPointerCancel={cancelResize}
          onLostPointerCapture={cancelResize}
          onKeyDown={(event) => {
            if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
            event.preventDefault();
            updateWidth(event.key === "ArrowLeft" ? MIN_WIDTH : 248);
          }}
          className={`absolute inset-y-0 -right-1 z-20 w-2 cursor-col-resize touch-none outline-none transition-colors hover:bg-white/20 focus-visible:bg-white/20 ${
            resizing ? "bg-white/20" : ""
          }`}
        />
      </motion.aside>

      {/* Main Workspace Area */}
      <div className="flex min-w-0 flex-1 flex-col h-full overflow-hidden">
        {/* Top Header Card Bar */}
        <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-slate-200/70 bg-white px-4 sm:px-6 shadow-2xs z-20">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-50/80 text-[#5826df] border border-indigo-100 shadow-2xs">
              <School className="h-5 w-5" />
            </span>
            <span className="truncate text-base font-bold tracking-tight text-slate-900 sm:text-lg">
              {currentSchoolDisplayName}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <div ref={notificationRef} className="relative">
              <button
                type="button"
                onClick={() => setNotificationsOpen((value) => !value)}
                aria-label="Notifications"
                aria-expanded={notificationsOpen}
                className="relative flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors shadow-2xs"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 ? (
                  <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white" />
                ) : (
                  <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
                )}
              </button>
              {notificationsOpen && (
                <div className="absolute right-0 z-30 mt-2 w-[min(340px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                  <p className="flex items-center gap-2 border-b border-slate-100 p-4 text-sm font-semibold text-slate-900">
                    <Bell className="h-4 w-4 text-[#5826df]" />
                    Notifications
                    {unreadCount > 0 && (
                      <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-[#5826df]">
                        {unreadCount} new
                      </span>
                    )}
                  </p>
                  <div className="max-h-80 overflow-y-auto">
                    {sortedNotifications.length ? (
                      sortedNotifications.map((notification) => {
                        const isRead = readIds.includes(notification.id);
                        return (
                          <button
                            key={notification.id}
                            type="button"
                            onClick={() => {
                              setSelectedNotification(notification);
                              markAsRead(notification.id);
                            }}
                            className={`flex w-full gap-3 border-b border-slate-100 p-4 text-left transition-colors hover:bg-slate-50 ${
                              isRead ? "" : "bg-indigo-50/40"
                            }`}
                          >
                            <span
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                                isRead ? "bg-slate-100 text-slate-500" : "bg-indigo-100 text-[#5826df]"
                              }`}
                            >
                              <Megaphone className="h-4 w-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center justify-between gap-1">
                                <span
                                  className={`truncate text-xs ${
                                    isRead ? "font-medium text-slate-600" : "font-semibold text-slate-900"
                                  }`}
                                >
                                  {notification.title}
                                </span>
                                {!isRead && <span className="h-2 w-2 shrink-0 rounded-full bg-[#5826df]" />}
                              </span>
                              <span className="mt-0.5 block line-clamp-2 text-xs text-slate-500">
                                {notification.description}
                              </span>
                              <span className="mt-1.5 block text-[10px] text-slate-400">
                                {new Date(notification.created_at).toLocaleString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </span>
                          </button>
                        );
                      })
                    ) : (
                      <div className="p-8 text-center text-slate-400">
                        <Megaphone className="mx-auto mb-2 h-8 w-8 stroke-[1.5]" />
                        <p className="text-sm font-semibold">No announcements yet</p>
                        <p className="mt-0.5 text-xs">You&apos;ll be alerted when a new notice is sent.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Pill */}
            <button
              type="button"
              onClick={() => setProfileOpen(true)}
              aria-label="Open my profile"
              title="View my profile"
              className="flex items-center gap-2.5 rounded-2xl pl-2 text-left transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5826df]/40"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#5826df] text-xs sm:text-sm font-bold text-white shadow-xs">
                {userInitials}
              </span>
              <span className="hidden sm:block text-left">
                <span className="block max-w-[140px] truncate text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                  {currentUserName}
                </span>
                <span className="block truncate text-xs text-slate-500 font-normal">{profile?.role || subtitle}</span>
              </span>
            </button>
          </div>
        </header>

        {/* Global School Subscription / Free Trial Status Notification (Shown only to School Trustees) */}
        {roleTitle === "Trustee" && <TrialBanner />}

        {/* Content Body */}
        <main className="min-h-0 flex-1 overflow-y-auto no-scrollbar px-4 sm:px-6 py-5 bg-[#f4f6fb]">
          {children}
        </main>
      </div>

      {/* Mobile Drawer Button */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation"
        className="fixed bottom-4 left-4 z-30 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-600/30 lg:hidden active:scale-95"
      >
        <Menu className="h-6 w-6" />
      </button>

      {/* Mobile Drawer Overlay & Sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="relative flex w-[280px] max-w-[85vw] flex-col bg-gradient-to-b from-[#4f46e5] via-[#4338ca] to-[#312e81] shadow-2xl z-10 overflow-hidden"
            >
              {navigation(false, () => setMobileOpen(false))}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />

      <AnimatePresence>
        {selectedNotification && (
          <div id="notification-detail-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40" onClick={() => setSelectedNotification(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative z-10 max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"
            >
              <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="flex items-center gap-2 text-base sm:text-lg font-bold text-slate-900">
                  <Megaphone className="h-5 w-5 text-[#5826df]" />
                  Announcement Detail
                </h3>
                <button onClick={() => setSelectedNotification(null)} className="rounded-xl p-1.5 text-slate-500 transition-colors hover:bg-slate-100" aria-label="Close announcement">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Title</h4>
                  <p className="mt-1 text-base font-bold text-slate-800">{selectedNotification.title}</p>
                </div>
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Description</h4>
                  <div className="mt-1 max-h-60 overflow-y-auto rounded-2xl border border-slate-100 bg-slate-50 p-3.5">
                    <p className="whitespace-pre-wrap leading-relaxed text-sm text-slate-600">{selectedNotification.description}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Target Audience</h4>
                    <span className="mt-1.5 inline-flex items-center rounded-lg border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-[#5826df]">
                      {selectedNotification.announcement_for ?? "ALL"}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Broadcast</h4>
                    <span className={`mt-1.5 inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold ${String(selectedNotification.is_everyone) === "true" ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-500"}`}>
                      {String(selectedNotification.is_everyone) === "true" ? "Yes" : "No"}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Published Date</h4>
                    <p className="mt-1 text-xs font-medium text-slate-600">
                      {new Date(selectedNotification.created_at).toLocaleString("en-IN", {
                        day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Expires Date</h4>
                    <p className={`mt-1 text-xs font-medium ${selectedNotification.expires_at && new Date(selectedNotification.expires_at).getTime() < Date.now() ? "text-red-600" : "text-slate-600"}`}>
                      {selectedNotification.expires_at
                        ? new Date(selectedNotification.expires_at).toLocaleString("en-IN", {
                            day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
                          })
                        : "Never"}
                      {selectedNotification.expires_at && new Date(selectedNotification.expires_at).getTime() < Date.now() && " (Expired)"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button onClick={() => setSelectedNotification(null)} className="rounded-xl bg-slate-100 px-5 py-2.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-200">
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
