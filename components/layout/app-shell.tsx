"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  Bell,
  BookOpen,
  CalendarCheck,
  ChevronDown,
  ClipboardList,
  Clock,
  FileCheck,
  FileText,
  Home,
  Calendar,
  MoreHorizontal,
  LayoutDashboard,
  Loader2,
  LogOut,
  Megaphone,
  Menu,
  School,
  Users,
  X,
} from "lucide-react";
import { logoutUser, getDashboardRoute } from "@/lib/auth";
import { useAnnouncementSocket } from "@/hooks/useAnnouncementSocket";
import { type AnnouncementResponse } from "@/lib/principal";
import { getCurrentUserProfile } from "@/lib/current-user";
import { ProfileDialog } from "@/components/profile/profile-dialog";
import { TrialBanner } from "@/components/subscription/TrialBanner";
import { PageTutorialDialog } from "@/components/tutorial/page-tutorial-dialog";
import { cn } from "@/lib/utils";
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
  /** Optional custom title for the top header bar (defaults to current school name or Platform for Super Admin). */
  headerTitle?: string;
  /** When true, removes the default outer padding from <main> */
  noPadding?: boolean;
  /** Custom class names to append or override on the <main> element */
  mainClassName?: string;
}

const MIN_WIDTH = 72;
const MAX_WIDTH = 320;
const EXPANDED_MIN = 224;
const COMPACT_MAX = 160;
const DEFAULT_WIDTH = 248;

const ROLE_ALLOWED_MAP: Record<string, string[]> = {
  "Super Admin": ["super_admin", "superadmin"],
  Trustee: ["admin(trustee)", "trustee", "super_admin", "superadmin"],
  Principal: ["principal", "super_admin", "superadmin", "admin(trustee)", "trustee"],
  Clerk: [
    "clerk",
    "fees_clerk",
    "assistant clerk",
    "assistant_clerk",
    "assistantclerk",
    "principal",
    "super_admin",
    "superadmin",
    "admin(trustee)",
    "trustee",
  ],
  Teacher: ["teacher", "principal", "super_admin", "superadmin", "admin(trustee)", "trustee"],
  Librarian: ["librarian", "principal", "super_admin", "superadmin", "admin(trustee)", "trustee"],
  Inventory: ["inventory", "principal", "super_admin", "superadmin", "admin(trustee)", "trustee"],
  Fees: [
    "fees management",
    "fees",
    "fees_clerk",
    "clerk",
    "assistant clerk",
    "assistant_clerk",
    "assistantclerk",
    "principal",
    "super_admin",
    "superadmin",
    "admin(trustee)",
    "trustee",
  ],
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

/** Finds the deepest link matching the current path and query so nested groups resolve. */
function findActive(links: SidebarLink[], pathname: string, currentQuery = ""): SidebarLink | undefined {
  const leaves = links.flatMap(link => link.subLinks?.length ? link.subLinks : [link]);
  const fullPath = currentQuery ? `${pathname}${currentQuery}` : pathname;

  // 1. Exact match with query params if fullPath matches link.href
  const exactMatch = leaves.find(link => link.href === fullPath);
  if (exactMatch) return exactMatch;

  // 2. Base pathname match for links without query params
  return leaves.filter(link => {
    const [base, query] = link.href.split("?");
    if (query) {
      return fullPath === link.href;
    }
    return pathname === base || (!link.exact && link !== links[0] && pathname.startsWith(`${base}/`));
  }).sort((a, b) => b.href.length - a.href.length)[0];
}

function formatSchoolDisplayName(name?: string | null): string {
  if (!name) return "VidyaSanchalan";
  const trimmed = name.trim();
  if (trimmed.toLowerCase() === "vidyasanchalan") return "VidyaSanchalan";
  return trimmed
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function
  AppShell({
    children,
    links,
    roleTitle,
    userName,
    onSignOut,
    headerTitle,
    noPadding,
    mainClassName,
  }: AppShellProps) {
  const router = useRouter();
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
      const rawRoles = localStorage.getItem("roles");
      if (rawRoles) {
        const roles: unknown = JSON.parse(rawRoles);
        if (Array.isArray(roles) && roles.length > 0) {
          const normalized = roles.map(role => String(role).toLowerCase().trim());
          if (!ROLE_ALLOWED_MAP[roleTitle!].some(role => normalized.includes(role))) {
            const route = getDashboardRoute(roles as string[]);
            window.location.replace(route && route !== pathname ? route : "/login");
            return;
          }
        }
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
  const { notifications, readIds, unreadCount, markAsRead, markAllAsRead } = useAnnouncementSocket();
  const [profile, setProfile] = useState<CurrentUserProfile | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<AnnouncementResponse | null>(null);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState<string | null>(null);
  const [schoolLogo, setSchoolLogo] = useState<string | null>(null);
  const [logoImgError, setLogoImgError] = useState(false);

  const getNotificationsUrl = useCallback(() => {
    const pathPrefix = (pathname || "").split("/")[1]?.toLowerCase();
    const knownRoles = [
      "librarian",
      "teacher",
      "clerk",
      "principal",
      "trustee",
      "fees",
      "inventory",
      "student",
      "parent",
      "superadmin",
      "admin",
    ];
    if (pathPrefix && knownRoles.includes(pathPrefix)) {
      return `/${pathPrefix}/notifications`;
    }
    if (roleTitle) {
      const roleNormalized = roleTitle.toLowerCase().replace(/[^a-z]/g, "");
      if (knownRoles.includes(roleNormalized)) {
        return `/${roleNormalized}/notifications`;
      }
    }
    const userRole = (profile?.role || "").toLowerCase().replace(/[^a-z]/g, "");
    if (userRole && knownRoles.includes(userRole)) {
      return `/${userRole}/notifications`;
    }
    return "/librarian/notifications";
  }, [pathname, roleTitle, profile?.role]);

  useEffect(() => {
    let mounted = true;
    getCurrentUserProfile()
      .then((data) => {
        if (!mounted) return;
        setProfile(data);
        if (data.school?.name) setSchoolName(data.school.name);
        const resolvedLogo = data.school?.logo || data.avatar;
        if (resolvedLogo) {
          setSchoolLogo(resolvedLogo);
          setLogoImgError(false);
        }
        const serverRoles = (data.roles || (data.role ? [data.role] : [])).map(r => String(r).toLowerCase().trim());
        if (requiresRoleCheck && roleTitle && ROLE_ALLOWED_MAP[roleTitle]) {
          const isAllowed = ROLE_ALLOWED_MAP[roleTitle].some(r => serverRoles.includes(r));
          if (!isAllowed) {
            const redirectRoute = getDashboardRoute(data.roles || (data.role ? [data.role] : []));
            window.location.replace(redirectRoute && redirectRoute !== pathname ? redirectRoute : "/login");
          }
        }
      })
      .catch(() => { /* keep the static fallback label */ });
    return () => { mounted = false; };
  }, [requiresRoleCheck, roleTitle, pathname]);

  useEffect(() => {
    try {
      setSchoolName(localStorage.getItem("school_name"));
      setSchoolLogo(localStorage.getItem("school_logo"));
    } catch { /* ignore */ }
  }, []);

  const [currentQuery, setCurrentQuery] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentQuery(window.location.search);
    }
  }, [pathname]);

  useEffect(() => {
    const handleLocationChange = () => {
      if (typeof window !== "undefined") {
        setCurrentQuery(window.location.search);
      }
    };
    window.addEventListener("popstate", handleLocationChange);
    return () => window.removeEventListener("popstate", handleLocationChange);
  }, []);

  // Auto-expand the group that owns the active page.
  useEffect(() => {
    const active = findActive(links, pathname, currentQuery);
    const owner = links.find(link => active && link.subLinks?.includes(active));
    if (owner) setOpenGroup(owner.title);
  }, [pathname, currentQuery, links]);

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
      if (target?.closest?.("#notification-detail-modal") || target?.closest?.("#mobile-notifications-panel")) return;
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
  const activeLink = findActive(links, pathname, currentQuery);

  const getBadgeColor = (title: string, index: number) => {
    const lower = title.toLowerCase().trim();
    if (lower === "dashboard") return "bg-blue-600 text-white";
    if (lower.includes("academic year")) return "bg-[#3b82f6] text-white";
    if (lower.includes("result dashboard")) return "bg-[#0284c7] text-white";
    if (lower.includes("result weightage") || lower.includes("weightage")) return "bg-[#2563eb] text-white";

    // Exam Management
    if (lower === "exam management") return "bg-[#ec4899] text-white";
    if (lower.includes("exam config") || lower.includes("configuration")) return "bg-[#64748b] text-white";
    if (lower.includes("exam schedule")) return "bg-[#06b6d4] text-white";
    if (lower.includes("exam timetable") || lower === "exam timetable") return "bg-[#38bdf8] text-white";
    if (lower.includes("seating")) return "bg-[#f97316] text-white";

    // Marks Management
    if (lower === "marks management" || lower.includes("marks entry")) return "bg-[#10b981] text-white";
    if (lower.includes("marks overview")) return "bg-[#14b8a6] text-white";
    if (lower.includes("marks verification") || lower.includes("class verification")) return "bg-[#22c55e] text-white";
    if (lower.includes("teacher assessment") || lower === "teacher assessment") return "bg-[#f59e0b] text-white";

    // Result Processing
    if (lower === "result processing") return "bg-[#e11d48] text-white";
    if (lower.includes("result preview")) return "bg-[#3b82f6] text-white";
    if (lower.includes("result verification")) return "bg-[#0284c7] text-white";
    if (lower.includes("result publish") || lower === "result publish") return "bg-[#06b6d4] text-white";
    if (lower.includes("published result") || lower.includes("progress report")) return "bg-[#f59e0b] text-white";

    if (lower.includes("generate salary") || lower.includes("generate-salary")) return "bg-[#f43f5e] text-white";
    if (lower.includes("salary component") || lower.includes("component")) return "bg-[#10b981] text-white";
    if (lower.includes("staff salary")) return "bg-[#f97316] text-white";
    if (lower.includes("certificate") || lower.includes("g.r.") || lower.includes("award") || lower.includes("docs")) return "bg-[#fbbf24] text-white";
    if (lower.includes("hr") || lower.includes("staff") || lower.includes("department")) return "bg-[#06b6d4] text-white";
    if (lower.includes("admission") || lower.includes("applicant") || lower.includes("student directory") || lower.includes("students")) return "bg-[#f43f5e] text-white";
    if (lower.includes("fee type")) return "bg-[#ec4899] text-white";
    if (lower.includes("fee structure")) return "bg-[#2563eb] text-white";
    if (lower.includes("generate fee") || lower.includes("genrate fee")) return "bg-[#10b981] text-white";
    if (lower.includes("student ledger") || lower.includes("ledger") || lower.includes("receipt")) return "bg-[#f97316] text-white";
    if (lower.includes("division")) return "bg-[#0284c7] text-white";
    if (lower.includes("categorie")) return "bg-[#fbbf24] text-white";
    if (lower.includes("school") || lower.includes("class") || lower.includes("profile")) return "bg-[#38bdf8] text-white";
    if (lower.includes("attendance")) return "bg-[#22c55e] text-white";
    if (lower.includes("curriculum") || lower.includes("subject") || lower.includes("syllabus")) return "bg-[#0284c7] text-white";
    if (lower.includes("teacher") || lower.includes("faculty") || lower.includes("workload")) return "bg-[#f97316] text-white";
    if (lower.includes("timetable") || lower.includes("schedule")) return "bg-[#06b6d4] text-white";
    if (lower.includes("announcement") || lower.includes("notice")) return "bg-[#ec4899] text-white";
    if (lower.includes("leave request")) return "bg-[#84cc16] text-white";
    if (lower.includes("my leave") || lower.includes("leave")) return "bg-[#fb7185] text-white";
    if (lower.includes("fee") || lower.includes("payment")) return "bg-[#10b981] text-white";
    if (lower.includes("inventory") || lower.includes("stock") || lower.includes("asset")) return "bg-[#0284c7] text-white";
    if (lower.includes("librar") || lower.includes("book")) return "bg-[#eab308] text-white";
    if (lower.includes("exam") || lower.includes("result") || lower.includes("mark")) return "bg-[#e11d48] text-white";
    if (lower.includes("homework") || lower.includes("assignment")) return "bg-[#06b6d4] text-white";
    if (lower.includes("setting") || lower.includes("config")) return "bg-[#64748b] text-white";

    const palette = [
      "bg-[#06b6d4] text-white", // Cyan
      "bg-[#10b981] text-white", // Emerald
      "bg-[#f97316] text-white", // Orange
      "bg-[#f43f5e] text-white", // Rose
      "bg-[#2563eb] text-white", // Blue
      "bg-[#38bdf8] text-white", // Sky
      "bg-[#fbbf24] text-white", // Amber
      "bg-[#22c55e] text-white", // Green
      "bg-[#ec4899] text-white", // Pink
      "bg-[#0284c7] text-white", // Light Blue
    ];
    return palette[index % palette.length];
  };

  const navItem = (link: SidebarLink, compact: boolean, index: number, onNavigate?: () => void) => {
    const selected = link === activeLink;
    const isParentOfActive = Boolean(link.subLinks?.some(sub => sub === activeLink));
    const Icon = link.icon;
    const badgeColor = getBadgeColor(link.title, index);

    const base = `group flex h-11 w-full items-center rounded-2xl text-xs sm:text-sm font-medium transition-all duration-200 ${compact ? "justify-center px-0" : "gap-3 px-3.5"
      }`;

    // Active item has white card style with deep blue text
    const tone = selected
      ? "bg-white text-blue-950 font-bold shadow-md shadow-blue-950/20"
      : "text-white/85 hover:bg-white/10 hover:text-white";

    if (link.subLinks?.length) {
      const groupOpen = !compact && openGroup === link.title;
      const childClasses = (active: boolean) =>
        `flex min-h-9 items-center gap-2.5 rounded-xl px-3 py-1.5 text-xs font-medium leading-5 transition-all ${active
          ? "bg-white/20 text-white font-bold shadow-2xs backdrop-blur-xs"
          : "text-blue-100/80 hover:bg-white/10 hover:text-white"
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
                  className={`h-4 w-4 shrink-0 text-white/70 transition-transform duration-200 ${groupOpen ? "rotate-180 text-white" : ""
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
                          onClick={() => {
                            if (sub.href.includes("?")) {
                              setCurrentQuery(sub.href.substring(sub.href.indexOf("?")));
                            } else {
                              setCurrentQuery("");
                            }
                            onNavigate?.();
                          }}
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

  const isSuperAdminRole =
    roleTitle === "Super Admin" ||
    (profile?.roles || []).some((r) => String(r).toLowerCase().includes("super"));
  const rawSchoolName =
    headerTitle ||
    (isSuperAdminRole
      ? "VidyaSanchalan Platform"
      : profile?.school?.name || schoolName || "VidyaSanchalan");
  const currentSchoolDisplayName = isSuperAdminRole
    ? "VidyaSanchalan Platform"
    : formatSchoolDisplayName(rawSchoolName);
  const activeLogo = isSuperAdminRole ? null : (profile?.school?.logo || profile?.avatar || schoolLogo);

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
          <div className="h-10 w-10 rounded-2xl bg-white/15 backdrop-blur-md p-1.5 flex items-center justify-center shadow-inner border border-white/20 overflow-hidden">
            {!logoImgError && activeLogo ? (
              <img
                src={activeLogo}
                alt={currentSchoolDisplayName}
                onError={() => setLogoImgError(true)}
                className="h-full w-full object-contain rounded-xl"
              />
            ) : (
              <School className="h-6 w-6 text-amber-300 drop-shadow-sm" />
            )}
          </div>
        </button>
        {!compact && (
          <div className="min-w-0">
            <p className="truncate text-base font-bold tracking-tight text-white drop-shadow-xs" title={currentSchoolDisplayName}>
              {currentSchoolDisplayName}
            </p>
            <p className="truncate text-xs text-blue-200/90 font-medium">{subtitle}</p>
          </div>
        )}
      </div>

      {/* Section Label */}
      {!compact && (
        <p className="px-6 pb-2 pt-6 text-[11px] font-bold uppercase tracking-widest text-blue-200/60">
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
          className={`flex h-11 w-full items-center rounded-2xl text-xs sm:text-sm font-medium text-blue-100 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50 ${compact ? "justify-center" : "gap-3 px-3.5"
            }`}
        >
          {signingOut ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogOut className="h-5 w-5" />}
          {!compact && <span>{signingOut ? "Signing out…" : "Sign out"}</span>}
        </button>
      </div>
    </div>
  );

  const sortedNotifications = [...notifications].sort((a, b) => {
    const aRead = readIds.some((rId) => String(rId) === String(a.id));
    const bRead = readIds.some((rId) => String(rId) === String(b.id));
    if (aRead !== bRead) return aRead ? 1 : -1;
    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
  });

  if (requiresRoleCheck && authorizedPath !== pathname) {
    return (
      <div className="flex h-svh items-center justify-center bg-[#f4f6fb] text-slate-900 font-semibold">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-blue-600" /> Checking access…
      </div>
    );
  }

  const currentUserName = profile?.name || userName || "Administrator";
  const userInitials = profile?.initials || currentUserName.slice(0, 2).toUpperCase() || "SA";

  // Derive role-aware mobile bottom navigation items (5 items: 4 core + More)
  const mobileNavItems = (() => {
    const role = (roleTitle || "").toLowerCase();

    if (role.includes("teacher")) {
      return [
        { title: "Dashboard", href: "/teacher", icon: Home },
        { title: "Attendance", href: "/teacher/my-attendance", icon: Calendar },
        { title: "Homework", href: "/teacher/Homework", icon: BookOpen },
        { title: "Materials", href: "/teacher/study-materials", icon: FileText },
      ];
    }

    if (role.includes("student")) {
      return [
        { title: "Dashboard", href: "/student", icon: LayoutDashboard },
        { title: "Attendance", href: "/student/attendance", icon: CalendarCheck },
        { title: "Homework", href: "/student/homework", icon: BookOpen },
        { title: "Timetable", href: "/student/timetable", icon: Clock },
      ];
    }

    if (role.includes("parent")) {
      return [
        { title: "Dashboard", href: "/parent", icon: LayoutDashboard },
        { title: "Children", href: "/parent/children", icon: Users },
        { title: "Attendance", href: "/parent/attendance", icon: CalendarCheck },
        { title: "Fees", href: "/parent/fees", icon: Banknote },
      ];
    }

    if (role.includes("clerk")) {
      return [
        { title: "Dashboard", href: "/clerk", icon: LayoutDashboard },
        { title: "Students", href: "/clerk/students", icon: Users },
        { title: "Fees", href: "/clerk/fees", icon: Banknote },
        { title: "Admissions", href: "/clerk/admissions", icon: FileCheck },
      ];
    }

    if (role.includes("librarian")) {
      return [
        { title: "Dashboard", href: "/librarian", icon: LayoutDashboard },
        { title: "Library", href: "/librarian/library", icon: BookOpen },
        { title: "Attendance", href: "/librarian/attendance", icon: ClipboardList },
        { title: "Leaves", href: "/librarian/leaves", icon: CalendarCheck },
      ];
    }

    // Default for Admin, Super Admin, Trustee, Principal, etc.
    return links.slice(0, 4).map((l) => ({
      title: l.title.split(" ")[0],
      href: l.href,
      icon: l.icon || LayoutDashboard,
    }));
  })();

  return (
    <div
      data-resizing={resizing}
      className={`app-workspace flex h-screen w-full overflow-hidden bg-[#F5F7FC] text-[#142044] print:h-auto print:overflow-visible print:bg-transparent ${
        resizing ? "cursor-col-resize select-none" : ""
      }`}
    >
      {/* Desktop Gradient Sidebar */}
      <motion.aside
        id="app-desktop-sidebar"
        animate={{ width: sidebarWidth }}
        initial={false}
        transition={{ duration: reducedMotion || resizing ? 0 : 0.15 }}
        className="workspace-navigation relative hidden h-full shrink-0 flex-col bg-gradient-to-b from-[#5436F5] via-[#4527D6] to-[#392BC9] shadow-xl lg:flex overflow-hidden print:hidden"
      >
        {/* Subtle Ambient Light Highlights */}
        <div className="pointer-events-none absolute -top-24 -left-24 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute bottom-0 -right-24 h-56 w-56 rounded-full bg-blue-900/40 blur-3xl" />

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
          className={`absolute inset-y-0 -right-1 z-20 w-2 cursor-col-resize touch-none outline-none transition-colors hover:bg-white/20 focus-visible:bg-white/20 ${resizing ? "bg-white/20" : ""
            }`}
        />
      </motion.aside>

      {/* Main Workspace Area */}
      <div className="flex min-w-0 flex-1 flex-col h-full overflow-hidden print:h-auto print:overflow-visible print:block">
        {/* Top Header Bar: Premium blue-purple gradient for Student, mobile gradient / desktop clean for others */}
        <header className={cn(
          "flex h-16 shrink-0 items-center justify-between gap-2 border-b px-3.5 sm:px-6 shadow-sm z-20 print:hidden",
          roleTitle === "Student"
            ? "border-blue-700/30 bg-gradient-to-r from-[#1D4ED8] via-[#2563EB] to-[#4338CA] text-white"
            : "border-blue-700/30 lg:border-[#E5EAF4] bg-gradient-to-r from-[#1D4ED8] via-[#2563EB] to-[#4338CA] lg:bg-none lg:bg-white text-white lg:text-[#142044]"
        )}>
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 border border-white/25 shadow-xs overflow-hidden">
              {roleTitle === "Student" && profile?.avatar ? (
                <img
                  src={profile.avatar}
                  alt={currentUserName}
                  className="h-full w-full object-cover rounded-full"
                />
              ) : !logoImgError && activeLogo ? (
                <img
                  src={activeLogo}
                  alt={currentSchoolDisplayName}
                  onError={() => setLogoImgError(true)}
                  className="h-full w-full object-contain p-0.5 rounded-full"
                />
              ) : (
                <svg className="w-5 h-5 text-[#FCD34D]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              )}
            </span>
            <div className="min-w-0">
              <span className={cn(
                "block truncate text-sm sm:text-base font-bold tracking-tight leading-tight",
                roleTitle === "Student" ? "text-white" : "text-white lg:text-[#142044]"
              )} title={roleTitle === "Student" ? (currentUserName || currentSchoolDisplayName) : currentSchoolDisplayName}>
                {roleTitle === "Student"
                  ? (currentUserName ? currentUserName.split(" ").slice(0, 2).join(" ") : "Student")
                  : currentSchoolDisplayName}
              </span>
              <span className={cn(
                "block truncate text-[11px] sm:text-xs leading-tight mt-0.5",
                roleTitle === "Student" ? "text-indigo-100/90 font-medium" : "text-white/80 lg:text-[#7183A6] font-normal"
              )}>
                {roleTitle === "Student" ? "Student" : (roleTitle || "Teacher")}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3.5">
            {/* Page Tutorial Help Button */}
            {roleTitle !== "Student" && (
              <PageTutorialDialog
              roleTitle={roleTitle}
              isSuperAdmin={
                roleTitle === "Super Admin" ||
                Boolean(profile?.is_superuser) ||
                (profile?.roles || (profile?.role ? [profile.role] : [])).some((r) =>
                  ["super_admin", "superadmin", "super-admin"].includes(String(r).toLowerCase().trim())
                )
              }
            />
            )}

            {/* Notification Bell */}
            <div ref={notificationRef} className="relative z-50">
              {/* Mobile View: Direct redirection to Notification Page */}
              <Link
                href={getNotificationsUrl()}
                aria-label="Notifications"
                className="relative flex h-9 w-9 items-center justify-center rounded-full text-white hover:bg-white/10 active:scale-95 transition-all lg:hidden cursor-pointer"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className={cn("absolute -top-0.5 -right-0.5 h-4 min-w-[16px] px-1 rounded-full text-[10px] font-black flex items-center justify-center shadow-xs", roleTitle === "Student" ? "bg-amber-400 text-amber-950" : "bg-[#FF4545] text-white")}>
                    {unreadCount}
                  </span>
                )}
              </Link>

              {/* Desktop View: Opens Notification Dropdown */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setNotificationsOpen((value) => !value);
                }}
                aria-label="Notifications"
                aria-expanded={notificationsOpen}
                className={cn(
                  "relative hidden lg:flex h-9 w-9 items-center justify-center rounded-full transition-colors cursor-pointer",
                  roleTitle === "Student"
                    ? "text-white hover:bg-white/10"
                    : "text-slate-600 hover:bg-slate-50"
                )}
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] px-1 rounded-full bg-[#FF4545] text-white text-[10px] font-black flex items-center justify-center shadow-xs">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Desktop Notification Dropdown */}
              {notificationsOpen && (
                <div className="hidden lg:block absolute right-0 z-[9999] mt-2 w-[380px] overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl">
                  <div className="flex items-center justify-between border-b border-slate-100 p-3.5 sm:p-4 text-sm font-semibold text-slate-900 bg-slate-50/50">
                    <p className="flex items-center gap-2">
                      <Bell className="h-4 w-4 text-[#2563EB]" />
                      Notifications
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-[#2563EB]">
                        {unreadCount} new
                      </span>
                    </p>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          markAllAsRead();
                        }}
                        className="text-[11px] font-medium text-[#2563EB] hover:underline cursor-pointer"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                    {sortedNotifications.length ? (
                      sortedNotifications.map((notification) => {
                        const isRead = readIds.some((rId) => String(rId) === String(notification.id));
                        return (
                          <button
                            key={notification.id}
                            type="button"
                            onClick={() => {
                              setSelectedNotification(notification);
                              markAsRead(notification.id);
                            }}
                            className={`flex w-full gap-3 p-3.5 text-left transition-colors hover:bg-slate-50 cursor-pointer ${
                              isRead ? "" : "bg-blue-50/40"
                            }`}
                          >
                            <span
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                                isRead ? "bg-slate-100 text-slate-500" : "bg-blue-100 text-[#2563EB]"
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
                                {!isRead && <span className="h-2 w-2 shrink-0 rounded-full bg-[#2563EB]" />}
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
                  <div className="border-t border-slate-100 p-2.5 bg-slate-50/80 text-center">
                    <Link
                      href={getNotificationsUrl()}
                      onClick={() => setNotificationsOpen(false)}
                      className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] hover:underline"
                    >
                      <span>Open Full Notification Hub</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
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
              className="flex items-center gap-2 pl-1 text-left transition-opacity hover:opacity-90 focus-visible:outline-none cursor-pointer"
            >
              <span className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full font-bold text-xs sm:text-sm shadow-xs border border-white/25",
                roleTitle === "Student"
                  ? "bg-white/20 text-white"
                  : "bg-[#1D4ED8] text-white lg:bg-[#2563EB]"
              )}>
                {userInitials || "ST"}
              </span>
              <div className="text-left hidden sm:flex items-center gap-1">
                <div>
                  <span className={cn(
                    "block max-w-[100px] truncate text-xs sm:text-sm font-semibold leading-tight",
                    roleTitle === "Student" ? "text-white" : "text-white lg:text-[#142044]"
                  )}>
                    {currentUserName || "Student"}
                  </span>
                  <span className={cn(
                    "block truncate text-[11px] font-normal leading-tight",
                    roleTitle === "Student" ? "text-white/80" : "text-white/75 lg:text-[#7183A6]"
                  )}>
                    {profile?.role?.toLowerCase() || (roleTitle || "student").toLowerCase()}
                  </span>
                </div>
                <ChevronDown className={cn(
                  "w-3.5 h-3.5 shrink-0",
                  roleTitle === "Student" ? "text-white/80" : "text-white/80 lg:text-slate-400"
                )} />
              </div>
              <ChevronDown className={cn("w-3.5 h-3.5 shrink-0 sm:hidden", roleTitle === "Student" ? "text-white/80" : "text-white/80")} />
            </button>
          </div>
        </header>

        {/* Global School Subscription / Free Trial Status Notification (Shown only to School Trustees) */}
        {roleTitle === "Trustee" && (
          <div className="print:hidden">
            <TrialBanner />
          </div>
        )}

        {/* Content Body: Snug pb-16 on mobile clears the 64px floating glass bar without creating excessive empty space */}
        <main
          className={cn(
            "min-h-0 flex-1 overflow-y-auto overflow-x-hidden w-full max-w-full min-w-0 no-scrollbar bg-[#F5F7FC] pb-28 lg:pb-0 print:p-0 print:m-0 print:overflow-visible print:h-auto print:bg-transparent print:max-w-none print:w-auto",
            (noPadding || roleTitle === "Teacher") ? "p-0 pb-28 lg:pb-0" : "px-2 sm:px-6 py-2.5 sm:py-5 pb-28 lg:pb-5",
            mainClassName
          )}
        >
          {children}
        </main>

        {/* Floating Frosted Glass Mobile Bottom Navigation Bar (Detached Island) */}
        <nav
          aria-label="Mobile Bottom Navigation"
          style={{
            WebkitBackdropFilter: "blur(24px) saturate(180%)",
            backdropFilter: "blur(24px) saturate(180%)",
          }}
          className="fixed bottom-3 inset-x-3 sm:inset-x-8 max-w-md mx-auto z-40 rounded-3xl bg-white/25 border border-slate-200/80 shadow-[0_12px_40px_rgba(0,0,0,0.1),0_2px_8px_rgba(0,0,0,0.04)] p-1.5 lg:hidden print:hidden"
        >
          <div className="flex items-center justify-around w-full">
            {mobileNavItems.map((item, idx) => {
              const pathLower = pathname.toLowerCase();
              const itemHrefLower = (item.href || "").toLowerCase();
              const isDashboard =
                item.title.toLowerCase() === "dashboard" ||
                itemHrefLower === "/" ||
                itemHrefLower.split("/").filter(Boolean).length <= 1;

              const isActive = isDashboard
                ? pathLower === itemHrefLower
                : pathLower === itemHrefLower ||
                  (itemHrefLower &&
                    itemHrefLower !== "/" &&
                    pathLower.startsWith(`${itemHrefLower}/`)) ||
                  (item.title === "Attendance" && pathLower.includes("attendance"));
              const Icon = item.icon;

              return (
                <Link
                  key={item.href || idx}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className="flex flex-col items-center justify-center flex-1 py-0.5 px-0.5 relative group"
                >
                  {isActive ? (
                    <div className="flex flex-col items-center">
                      <div
                        style={{
                          WebkitBackdropFilter: "blur(20px) saturate(180%)",
                          backdropFilter: "blur(20px) saturate(180%)",
                        }}
                        className="px-3.5 py-1.5 rounded-2xl bg-white/40 border border-slate-300 text-slate-900 shadow-xs flex flex-col items-center"
                      >
                        <Icon className="w-4 h-4 text-slate-900" />
                        <span className="text-[9.5px] font-bold text-slate-900 mt-0.5 leading-none">
                          {item.title}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center py-1">
                      <Icon className="w-4 h-4 text-slate-500 group-hover:text-slate-800 transition-colors" />
                      <span className="text-[9.5px] font-semibold text-slate-500 group-hover:text-slate-800 transition-colors mt-0.5 leading-none">
                        {item.title}
                      </span>
                    </div>
                  )}
                </Link>
              );
            })}

            {/* 5th Item: More Menu */}
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open full menu"
              className="flex flex-col items-center justify-center flex-1 py-1 px-0.5 text-slate-500 hover:text-slate-900 transition-all cursor-pointer"
            >
              <MoreHorizontal className="w-4 h-4 text-slate-500" />
              <span className="text-[9.5px] font-semibold text-slate-500 mt-0.5 leading-none">
                More
              </span>
            </button>
          </div>
        </nav>
      </div>

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
              className="relative flex w-[280px] max-w-[85vw] flex-col bg-gradient-to-b from-[#1E40AF] via-[#1D4ED8] to-[#172554] shadow-2xl z-10 overflow-hidden"
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
                  <Megaphone className="h-5 w-5 text-[#2563EB]" />
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
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Posted By</h4>
                    <p className="mt-1 text-xs font-semibold text-slate-800">
                      {selectedNotification.created_by_name || selectedNotification.created_by_role || "School Administration"}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Priority</h4>
                    <span className="mt-1 inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                      {selectedNotification.priority || "NORMAL"}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Target Audience</h4>
                    <span className="mt-1.5 inline-flex items-center rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-[#2563EB]">
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
                <button
                  type="button"
                  onClick={() => setSelectedNotification(null)}
                  className="rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md shadow-blue-500/25 px-6 py-2.5 text-xs font-bold transition-all active:scale-[0.98]"
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
