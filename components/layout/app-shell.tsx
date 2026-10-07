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
  const [sidebarWidth, setSidebarWidth] = useState(MIN_WIDTH);
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

  const subtitle = roleTitle || "Super Admin";
  const activeLink = findActive(links, pathname);

  const navItem = (link: SidebarLink, compact: boolean, onNavigate?: () => void) => {
    const selected = link === activeLink;
    const Icon = link.icon;
    const base = `flex h-11 w-full items-center rounded-lg text-sm font-medium transition-colors ${compact ? "justify-center px-0" : "gap-3 px-3"}`;
    const tone = selected
      ? "bg-sky-50 text-sky-800 ring-1 ring-inset ring-sky-200 dark:bg-sky-400/15 dark:text-sky-200 dark:ring-sky-400/25"
      : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100";

    if (link.subLinks?.length) {
      const groupOpen = !compact && openGroup === link.title;
      const childClasses = (active: boolean) =>
        `flex min-h-10 items-center gap-2.5 rounded-lg px-3 py-2 text-sm leading-5 transition-colors ${active
          ? "bg-sky-50 font-semibold text-sky-800 ring-1 ring-inset ring-sky-200 dark:bg-sky-400/15 dark:text-sky-200 dark:ring-sky-400/25"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"}`;

      return (
        <div key={link.href} className="space-y-1">
          <button
            type="button"
            onClick={() => { if (compact) updateWidth(DEFAULT_WIDTH); setOpenGroup(groupOpen ? null : link.title); }}
            title={compact ? link.title : undefined}
            aria-label={compact ? link.title : undefined}
            aria-expanded={compact ? undefined : groupOpen}
            className={`${base} ${tone}`}
          >
            <Icon className="h-[18px] w-[18px] shrink-0" />
            {!compact && <>
              <span className="flex-1 text-left">{link.title}</span>
              <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${groupOpen ? "rotate-180" : ""}`} />
            </>}
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
                  <div className="ml-5 space-y-1 border-l border-slate-200 py-1 pl-3 pr-1 dark:border-zinc-700">
                    {link.subLinks.map((sub) => {
                      const subActive = sub === activeLink;
                      const SubIcon = sub.icon;
                      return (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          onClick={onNavigate}
                          aria-current={subActive ? "page" : undefined}
                          className={childClasses(subActive)}
                        >
                          <SubIcon aria-hidden="true" className="h-4 w-4 shrink-0" />
                          <span className="min-w-0">{sub.title}</span>
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
        <Icon className="h-[18px] w-[18px] shrink-0" />
        {!compact && <span className="truncate">{link.title}</span>}
      </Link>
    );
  };

  const navigation = (compact: boolean, onNavigate?: () => void) => (
    <>
      <div className={`flex h-16 shrink-0 items-center border-b border-slate-200 dark:border-zinc-800 ${compact ? "justify-center" : "gap-3 px-5"}`}>
        <button type="button" aria-label={expanded ? "Collapse navigation" : "Expand navigation"} onClick={() => updateWidth(expanded ? MIN_WIDTH : DEFAULT_WIDTH)} className="shrink-0 rounded-xl focus-visible:outline-2"><img src="/logo.png" alt="VidyaSanchalan" className="h-10 w-10 rounded-xl bg-white object-contain p-1" /></button>
        {!compact && (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight text-slate-900 dark:text-zinc-100">VidyaSanchalan</p>
            <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-zinc-400">{subtitle}</p>
          </div>
        )}
      </div>
      {!compact && <p className="px-6 pb-2 pt-6 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-zinc-500">Workspace</p>}
      <nav className={`flex-1 space-y-1 overflow-y-auto no-scrollbar p-3 ${compact ? "pt-6" : ""}`} aria-label={`${subtitle} navigation`}>
        {links.map((link) => navItem(link, compact, onNavigate))}
      </nav>
      <div className="border-t border-slate-200 dark:border-zinc-800 p-3">
        <button
          type="button"
          onClick={signOut}
          disabled={signingOut}
          title={compact ? (signingOut ? "Signing out…" : "Sign out") : undefined}
          aria-label="Sign out"
          className={`flex h-11 w-full items-center rounded-lg text-sm font-medium text-slate-600 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:text-zinc-400 dark:hover:bg-rose-950 dark:hover:text-rose-300 disabled:opacity-50 ${compact ? "justify-center" : "gap-3 px-3"}`}
        >
          {signingOut ? <Loader2 className="h-[18px] w-[18px] animate-spin" /> : <LogOut className="h-[18px] w-[18px]" />}
          {!compact && <span>{signingOut ? "Signing out…" : "Sign out"}</span>}
        </button>
      </div>
    </>
  );

  const sortedNotifications = [...notifications].sort((a, b) => {
    const aRead = readIds.includes(a.id);
    const bRead = readIds.includes(b.id);
    if (aRead !== bRead) return aRead ? 1 : -1;
    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
  });

  if (requiresRoleCheck && authorizedPath !== pathname) {
    return <div className="flex h-svh items-center justify-center bg-slate-50 text-slate-600"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Checking access…</div>;
  }

  return (
    <div
      data-resizing={resizing}
      className={`app-workspace flex h-svh overflow-hidden bg-slate-50 text-slate-900 dark:bg-zinc-950 dark:text-zinc-100 ${resizing ? "cursor-col-resize select-none" : ""}`}
    >
      <motion.aside
        id="app-desktop-sidebar"
        animate={{ width: sidebarWidth }}
        initial={false}
        transition={{ duration: reducedMotion || resizing ? 0 : 0.15 }}
        className="workspace-navigation relative hidden shrink-0 flex-col border-r border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 lg:flex"
      >
        <div className="flex h-full min-w-0 flex-col overflow-hidden">{navigation(!expanded)}</div>
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
          className={`absolute inset-y-0 -right-1 z-20 w-2 cursor-col-resize touch-none outline-none transition-colors hover:bg-[#1D496C]/20 focus-visible:bg-[#1D496C]/20 ${resizing ? "bg-[#1D496C]/20" : ""}`}
        />
      </motion.aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-900 lg:px-6">
          <div className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-[#1D496C] dark:bg-sky-400/10 dark:text-sky-300"><School className="h-5 w-5" /></span><span className="truncate text-sm font-semibold tracking-tight sm:text-base">{profile?.school?.name || schoolName || "School"}</span></div>

          <div className="flex items-center gap-3">
            <div ref={notificationRef} className="relative">
              <button
                type="button"
                onClick={() => setNotificationsOpen((value) => !value)}
                aria-label="Notifications"
                aria-expanded={notificationsOpen}
                className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 rounded-full bg-[#1D496C] px-1 text-[10px] font-semibold text-white">
                    {unreadCount}
                  </span>
                )}
              </button>
              {notificationsOpen && (
                <div className="absolute right-0 z-30 mt-2 w-[min(320px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                  <p className="flex items-center gap-2 border-b border-slate-100 p-4 text-sm font-semibold">
                    <Bell className="h-4 w-4 text-[#1D496C]" />
                    Notifications
                    {unreadCount > 0 && (
                      <span className="rounded-full bg-[#1D496C]/10 px-2 py-0.5 text-[10px] font-semibold text-[#1D496C]">
                        {unreadCount} new
                      </span>
                    )}
                  </p>
                  <div className="max-h-80 overflow-y-auto">
                    {sortedNotifications.length ? sortedNotifications.map((notification) => {
                      const isRead = readIds.includes(notification.id);
                      return (
                        <button
                          key={notification.id}
                          type="button"
                          onClick={() => { setSelectedNotification(notification); markAsRead(notification.id); }}
                          className={`flex w-full gap-3 border-b border-slate-100 p-4 text-left transition-colors hover:bg-slate-50 ${isRead ? "" : "bg-[#1D496C]/5"}`}
                        >
                          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${isRead ? "bg-slate-100 text-slate-500" : "bg-[#1D496C]/10 text-[#1D496C]"}`}>
                            <Megaphone className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center justify-between gap-1">
                              <span className={`truncate text-xs ${isRead ? "font-medium text-slate-600" : "font-semibold text-slate-900"}`}>
                                {notification.title}
                              </span>
                              {!isRead && <span className="h-2 w-2 shrink-0 rounded-full bg-[#1D496C]" />}
                            </span>
                            <span className="mt-0.5 block line-clamp-2 text-xs text-slate-500">{notification.description}</span>
                            <span className="mt-1.5 block text-[10px] text-slate-400">
                              {new Date(notification.created_at).toLocaleString("en-IN", {
                                day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
                              })}
                            </span>
                          </span>
                        </button>
                      );
                    }) : (
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

            <button
              type="button"
              onClick={() => setProfileOpen(true)}
              aria-label="Open my profile"
              title="View my profile"
              className="flex items-center gap-2 rounded-lg border-l border-slate-200 pl-3 text-left transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D496C]/40"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold text-slate-600">
                {profile?.initials || userName || "SA"}
              </span>
              <span className="hidden sm:block">
                <span className="block max-w-[160px] truncate text-xs font-semibold">{profile?.name || userName || "Super Admin"}</span>
                <span className="mt-0.5 block truncate text-[11px] text-slate-500">{profile?.role || subtitle}</span>
              </span>
            </button>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto no-scrollbar p-4 lg:p-6">{children}</main>
      </div>

      <button type="button" onClick={() => setMobileOpen(true)} aria-label="Open navigation" className="fixed bottom-4 left-4 z-30 flex h-11 w-11 items-center justify-center rounded-xl bg-[#1D496C] text-white shadow-lg lg:hidden"><Menu className="h-5 w-5" /></button>
      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />

      <AnimatePresence>
        {selectedNotification && (
          <div id="notification-detail-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40" onClick={() => setSelectedNotification(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative z-10 max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
            >
              <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                  <Megaphone className="h-5 w-5 text-[#1D496C]" />
                  Announcement Detail
                </h3>
                <button onClick={() => setSelectedNotification(null)} className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100" aria-label="Close announcement">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Title</h4>
                  <p className="mt-1 text-base font-semibold text-slate-800">{selectedNotification.title}</p>
                </div>
                <div>
                  <h4 className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Description</h4>
                  <div className="mt-1 max-h-60 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50 p-3.5">
                    <p className="whitespace-pre-wrap leading-relaxed text-sm text-slate-600">{selectedNotification.description}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                  <div>
                    <h4 className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Target Audience</h4>
                    <span className="mt-1.5 inline-flex items-center rounded-md border border-[#1D496C]/15 bg-[#1D496C]/5 px-2.5 py-1 text-xs font-medium text-[#1D496C]">
                      {selectedNotification.announcement_for ?? "ALL"}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Broadcast</h4>
                    <span className={`mt-1.5 inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium ${String(selectedNotification.is_everyone) === "true" ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-500"}`}>
                      {String(selectedNotification.is_everyone) === "true" ? "Yes" : "No"}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <h4 className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Published Date</h4>
                    <p className="mt-1 text-xs font-medium text-slate-600">
                      {new Date(selectedNotification.created_at).toLocaleString("en-IN", {
                        day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Expires Date</h4>
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
                <button onClick={() => setSelectedNotification(null)} className="rounded-lg bg-slate-100 px-5 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200">
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reducedMotion ? 0 : 0.15 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-slate-900/30 lg:hidden"
            />
            <motion.aside
              initial={{ x: reducedMotion ? 0 : -280 }}
              animate={{ x: 0 }}
              exit={{ x: reducedMotion ? 0 : -280 }}
              transition={{ duration: reducedMotion ? 0 : 0.2 }}
              aria-label="Mobile navigation"
              className="workspace-navigation fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 lg:hidden"
            >
              {navigation(false, () => setMobileOpen(false))}
              <button
                type="button"
                aria-label="Close navigation"
                onClick={() => setMobileOpen(false)}
                className="absolute right-2 top-4 flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-500 dark:bg-zinc-900 dark:text-zinc-400"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      </div>
  );
}
