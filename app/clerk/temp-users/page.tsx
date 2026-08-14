"use client";

import React, { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
    Users,
    UserCheck,
    UserX,
    RefreshCw,
    Search,
    ChevronLeft,
    ChevronRight,
    ShieldOff,
    ShieldCheck,
    Loader2,
    Zap,
} from "lucide-react";
import { getTempUsersForPrincipal, activateTempUser, deactivateTempUser, deactivateAllTempUsers } from "@/lib/principal";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TempUser {
    id: number;
    username: string;
    email: string | null;
    mobile: string | null;
    status: "active" | "deactivated";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(username: string) {
    return username.slice(0, 2).toUpperCase();
}

const AVATAR_PALETTES = [
    "from-violet-500 to-purple-600",
    "from-blue-500 to-cyan-600",
    "from-emerald-500 to-teal-600",
    "from-orange-500 to-amber-600",
    "from-pink-500 to-rose-600",
    "from-indigo-500 to-blue-600",
    "from-fuchsia-500 to-pink-600",
    "from-sky-500 to-indigo-600",
];

function avatarGradient(username: string) {
    const idx = username.charCodeAt(0) % AVATAR_PALETTES.length;
    return AVATAR_PALETTES[idx];
}

// ─── Animation Hook ───────────────────────────────────────────────────────────

function useMountAnimation(delay = 0) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        const t = setTimeout(() => setMounted(true), delay);
        return () => clearTimeout(t);
    }, [delay]);
    return mounted;
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
    icon,
    label,
    value,
    sub,
    gradient,
    delay = 0,
}: {
    icon: React.ReactNode;
    label: string;
    value: number;
    sub: string;
    gradient: string;
    delay?: number;
}) {
    const mounted = useMountAnimation(delay);

    return (
        <div
            className="relative overflow-hidden rounded-2xl bg-white border border-slate-100 shadow-sm p-5 transition-all duration-700 hover:shadow-lg hover:-translate-y-0.5 group"
            style={{
                opacity: mounted ? 1 : 0,
                transform: mounted ? "translateY(0)" : "translateY(20px)",
                transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms, box-shadow 0.2s ease, translate 0.2s ease`,
            }}
        >
            {/* Gradient accent top bar */}
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${gradient} rounded-t-2xl`} />

            {/* Background glow on hover */}
            <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300 rounded-2xl`} />

            <div className="flex items-center gap-4 relative">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-lg flex-shrink-0`}>
                    <span className="text-white">{icon}</span>
                </div>
                <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest truncate">{label}</p>
                    <p className="text-3xl font-black text-slate-800 leading-none mt-1 tabular-nums">{value}</p>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">{sub}</p>
                </div>
            </div>
        </div>
    );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: TempUser["status"] }) {
    if (status === "active") {
        return (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700">
                <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                Active
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500">
            <span className="h-2 w-2 rounded-full bg-slate-300 inline-block" />
            Inactive
        </span>
    );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ username }: { username: string }) {
    return (
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${avatarGradient(username)} text-white text-xs font-bold flex-shrink-0 shadow-sm`}>
            {getInitials(username)}
        </div>
    );
}

// ─── Toggle Button ────────────────────────────────────────────────────────────

function ToggleButton({
    status,
    loading,
    onClick,
}: {
    status: TempUser["status"];
    loading: boolean;
    onClick: () => void;
}) {
    const isActive = status === "active";
    return (
        <button
            onClick={onClick}
            disabled={loading}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold border transition-all duration-200 disabled:opacity-60 active:scale-95 ${isActive
                    ? "border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:border-red-300 hover:shadow-sm"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 hover:shadow-sm"
                }`}
        >
            {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : isActive ? (
                <ShieldOff className="h-3.5 w-3.5" />
            ) : (
                <ShieldCheck className="h-3.5 w-3.5" />
            )}
            {loading ? "Wait…" : isActive ? "Deactivate" : "Activate"}
        </button>
    );
}

// ─── Mobile User Card ─────────────────────────────────────────────────────────

function MobileUserCard({
    user,
    index,
    onToggle,
    toggling,
    animDelay,
}: {
    user: TempUser;
    index: number;
    onToggle: (id: number, currentStatus: TempUser["status"]) => void;
    toggling: number | null;
    animDelay: number;
}) {
    const mounted = useMountAnimation(animDelay);

    return (
        <div
            className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm hover:shadow-md transition-all duration-300"
            style={{
                opacity: mounted ? 1 : 0,
                transform: mounted ? "translateX(0)" : "translateX(-16px)",
                transition: `opacity 0.5s ease ${animDelay}ms, transform 0.5s ease ${animDelay}ms`,
            }}
        >
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                    <Avatar username={user.username} />
                    <div>
                        <p className="font-bold text-slate-800 text-sm">{user.username}</p>
                        <p className="text-xs text-slate-400 font-mono">#{String(index + 1).padStart(3, "0")}</p>
                    </div>
                </div>
                <StatusBadge status={user.status} />
            </div>

            <div className="bg-slate-50 rounded-xl p-3 mb-3 space-y-2">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider w-12">Email</span>
                    <span className="text-xs text-slate-600 truncate font-medium">
                        {user.email ?? <span className="text-slate-300 italic">—</span>}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider w-12">Mobile</span>
                    <span className="text-xs text-slate-600 font-medium">
                        {user.mobile ?? <span className="text-slate-300 italic">—</span>}
                    </span>
                </div>
            </div>

            <ToggleButton
                status={user.status}
                loading={toggling === user.id}
                onClick={() => onToggle(user.id, user.status)}
            />
        </div>
    );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ search }: { search: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                <Users className="h-8 w-8 text-slate-300" />
            </div>
            <p className="text-base font-bold text-slate-700 mb-1">
                {search ? "No results found" : "No users yet"}
            </p>
            <p className="text-sm text-slate-400 text-center max-w-xs">
                {search
                    ? `No users match "${search}". Try a different search.`
                    : "Temp users will appear here once created."}
            </p>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

export default function TempUsersPage() {
    const [users, setUsers] = useState<TempUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [toggling, setToggling] = useState<number | null>(null);
    const [deactivatingAll, setDeactivatingAll] = useState(false);
    const [page, setPage] = useState(1);
    const [headerMounted, setHeaderMounted] = useState(false);
    const searchRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const t = setTimeout(() => setHeaderMounted(true), 50);
        return () => clearTimeout(t);
    }, []);

    // ── ALL API LOGIC UNCHANGED ───────────────────────────────────────────────

    async function loadUsers() {
        setLoading(true);
        setError(null);
        try {
            const data = await getTempUsersForPrincipal();
            setUsers(data.map((u) => ({ ...u, status: u.is_active ? "active" : "deactivated" as const })));
        } catch (e: any) {
            setError(e.message ?? "Failed to load users");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { loadUsers(); }, []);
    useEffect(() => { setPage(1); }, [search]);

    const filtered = users.filter(
        (u) =>
            u.username.toLowerCase().includes(search.toLowerCase()) ||
            (u.email ?? "").toLowerCase().includes(search.toLowerCase()) ||
            (u.mobile ?? "").includes(search)
    );

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const totalUsers = users.length;
    const activeUsers = users.filter((u) => u.status === "active").length;
    const deactivatedUsers = users.filter((u) => u.status === "deactivated").length;

    async function handleToggle(id: number, currentStatus: TempUser["status"]) {
        setToggling(id);
        try {
            if (currentStatus === "deactivated") {
                await activateTempUser(id);
                setUsers((prev) => prev.map((u) => u.id === id ? { ...u, status: "active" } : u));
            } else {
                await deactivateTempUser(id);
                setUsers((prev) => prev.map((u) => u.id === id ? { ...u, status: "deactivated" } : u));
            }
        } catch (e: any) {
            toast.error(e.message ?? "Action failed");
        } finally {
            setToggling(null);
        }
    }

    async function handleDeactivateAll() {
        setDeactivatingAll(true);
        try {
            await deactivateAllTempUsers();
            setUsers((prev) => prev.map((u) => ({ ...u, status: "deactivated" })));
        } catch (e: any) {
            toast.error(e.message ?? "Failed to deactivate all users");
        } finally {
            setDeactivatingAll(false);
        }
    }

    // ── RENDER ────────────────────────────────────────────────────────────────

    return (
        <>
            <style>{`
                @keyframes fadeSlideDown {
                    from { opacity: 0; transform: translateY(-12px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes fadeSlideUp {
                    from { opacity: 0; transform: translateY(12px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes shimmer {
                    0%   { background-position: -400px 0; }
                    100% { background-position: 400px 0; }
                }
                .anim-header { animation: fadeSlideDown 0.5s ease forwards; }
                .anim-up     { animation: fadeSlideUp 0.5s ease forwards; }
                .skeleton {
                    background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
                    background-size: 400px 100%;
                    animation: shimmer 1.4s infinite;
                }
                .row-enter {
                    animation: fadeSlideUp 0.4s ease forwards;
                }
            `}</style>

            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 p-3 sm:p-6">

                {/* ── Header ── */}
                <div
                    className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
                    style={{ opacity: headerMounted ? 1 : 0, animation: headerMounted ? "fadeSlideDown 0.5s ease forwards" : "none" }}
                >
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
                                <Users className="h-4 w-4 text-white" />
                            </div>
                            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Temp Users</h1>
                        </div>
                        <p className="text-sm text-slate-500 ml-9">
                            Manage temporary accounts — activate or deactivate as needed.
                        </p>
                    </div>

                    <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                        <button
                            onClick={() => { setSearch(""); loadUsers(); }}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition-all duration-200 hover:bg-slate-50 hover:shadow-md active:scale-95"
                        >
                            <RefreshCw className={`h-4 w-4 transition-transform duration-500 ${loading ? "animate-spin" : ""}`} />
                            Refresh
                        </button>
                        <button
                            onClick={handleDeactivateAll}
                            disabled={deactivatingAll || activeUsers === 0}
                            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-red-200 transition-all duration-200 hover:shadow-md hover:shadow-red-200 hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none"
                        >
                            {deactivatingAll
                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                : <ShieldOff className="h-4 w-4" />}
                            {deactivatingAll ? "Deactivating…" : "Deactivate All"}
                        </button>
                    </div>
                </div>

                {/* ── Error Banner ── */}
                {error && (
                    <div className="mb-5 flex items-center gap-3 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 anim-up">
                        <span className="h-2 w-2 rounded-full bg-red-500 flex-shrink-0" />
                        {error}
                        <button onClick={loadUsers} className="ml-auto text-xs font-bold underline hover:no-underline">
                            Retry
                        </button>
                    </div>
                )}

                {/* ── Stat Cards ── */}
                <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <StatCard
                        icon={<Users className="h-5 w-5" />}
                        label="Total Users"
                        value={totalUsers}
                        sub="All temporary accounts"
                        gradient="from-blue-500 to-indigo-600"
                        delay={100}
                    />
                    <StatCard
                        icon={<UserCheck className="h-5 w-5" />}
                        label="Active"
                        value={activeUsers}
                        sub="Currently active"
                        gradient="from-emerald-500 to-teal-600"
                        delay={180}
                    />
                    <StatCard
                        icon={<UserX className="h-5 w-5" />}
                        label="Inactive"
                        value={deactivatedUsers}
                        sub="Currently deactivated"
                        gradient="from-orange-500 to-red-500"
                        delay={260}
                    />
                </div>

                {/* ── Main Table Card ── */}
                <div
                    className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden"
                    style={{ animation: "fadeSlideUp 0.6s ease 0.3s both" }}
                >
                    {/* Card Header */}
                    <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:px-6 sm:flex-row sm:items-center sm:justify-between bg-gradient-to-r from-slate-50 to-white">
                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-sm flex-shrink-0">
                                <Zap className="h-4 w-4 text-white" />
                            </div>
                            <div>
                                <p className="text-base font-bold text-slate-800">User Directory</p>
                                <p className="text-xs text-slate-400">
                                    {filtered.length} {filtered.length === 1 ? "user" : "users"} {search ? "found" : "total"}
                                </p>
                            </div>
                        </div>

                        {/* Search */}
                        <div className="relative w-full sm:w-60">
                            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <input
                                ref={searchRef}
                                type="text"
                                placeholder="Search users…"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent transition-all duration-200"
                            />
                            {search && (
                                <button
                                    onClick={() => setSearch("")}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-300 transition-colors"
                                >
                                    <span className="text-[10px] font-bold leading-none">✕</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* ── Desktop Table ── */}
                    <div className="hidden sm:block overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-100">
                                    {["#", "User", "Email", "Mobile", "Status", "Action"].map((h, i) => (
                                        <th
                                            key={h}
                                            className={`px-6 py-3.5 text-[11px] font-bold uppercase tracking-widest text-slate-400 bg-slate-50/70 ${i === 5 ? "text-right" : "text-left"}`}
                                        >
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <tr key={i}>
                                            {Array.from({ length: 6 }).map((_, j) => (
                                                <td key={j} className="px-6 py-4">
                                                    <div className={`skeleton h-4 rounded-lg ${j === 1 ? "w-32" : j === 2 ? "w-40" : j === 5 ? "w-20 ml-auto" : "w-16"}`} />
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                ) : paginated.length === 0 ? (
                                    <tr>
                                        <td colSpan={6}>
                                            <EmptyState search={search} />
                                        </td>
                                    </tr>
                                ) : (
                                    paginated.map((user, index) => (
                                        <tr
                                            key={user.id}
                                            className="hover:bg-blue-50/30 transition-colors duration-150 group row-enter"
                                            style={{ animationDelay: `${index * 40}ms` }}
                                        >
                                            <td className="px-6 py-4 text-slate-400 text-xs font-mono font-medium">
                                                {String((page - 1) * PAGE_SIZE + index + 1).padStart(2, "0")}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <Avatar username={user.username} />
                                                    <div>
                                                        <p className="font-semibold text-slate-800 text-sm leading-tight">{user.username}</p>
                                                        <p className="text-[11px] text-slate-400 font-mono">ID #{user.id}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 text-sm">
                                                {user.email ?? <span className="text-slate-300">—</span>}
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 text-sm font-mono">
                                                {user.mobile ?? <span className="text-slate-300 font-sans">—</span>}
                                            </td>
                                            <td className="px-6 py-4">
                                                <StatusBadge status={user.status} />
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <ToggleButton
                                                    status={user.status}
                                                    loading={toggling === user.id}
                                                    onClick={() => handleToggle(user.id, user.status)}
                                                />
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* ── Mobile Cards ── */}
                    <div className="block sm:hidden">
                        {loading ? (
                            <div className="p-3 space-y-3">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <div key={i} className="rounded-2xl border border-slate-100 bg-white p-4">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="skeleton h-9 w-9 rounded-xl" />
                                            <div className="space-y-1.5 flex-1">
                                                <div className="skeleton h-3.5 w-28 rounded" />
                                                <div className="skeleton h-3 w-16 rounded" />
                                            </div>
                                            <div className="skeleton h-6 w-16 rounded-full" />
                                        </div>
                                        <div className="skeleton h-16 rounded-xl mb-3" />
                                        <div className="skeleton h-8 rounded-lg w-24" />
                                    </div>
                                ))}
                            </div>
                        ) : paginated.length === 0 ? (
                            <EmptyState search={search} />
                        ) : (
                            <div className="p-3 space-y-3">
                                {paginated.map((user, index) => (
                                    <MobileUserCard
                                        key={user.id}
                                        user={user}
                                        index={(page - 1) * PAGE_SIZE + index}
                                        onToggle={handleToggle}
                                        toggling={toggling}
                                        animDelay={index * 60}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ── Pagination ── */}
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-t border-slate-100 px-4 sm:px-6 py-4 bg-slate-50/50">
                        <p className="text-xs text-slate-400 text-center sm:text-left">
                            {filtered.length === 0
                                ? "No results"
                                : <>Showing <span className="font-semibold text-slate-600">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)}</span> of <span className="font-semibold text-slate-600">{filtered.length}</span> users</>
                            }
                        </p>
                        <div className="flex items-center justify-center gap-1.5">
                            <button
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 active:scale-95"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                                <button
                                    key={p}
                                    onClick={() => setPage(p)}
                                    className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold transition-all duration-150 active:scale-95 ${p === page
                                            ? "bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-sm shadow-blue-200"
                                            : "border border-slate-200 bg-white text-slate-500 hover:bg-slate-100"
                                        }`}
                                >
                                    {p}
                                </button>
                            ))}
                            <button
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 active:scale-95"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
