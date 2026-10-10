"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  SupportTicket,
  SupportTicketStats,
  SupportTicketFilters,
  getSupportTickets,
  getSupportTicketStats,
  acceptSupportTicket,
} from "@/lib/support";
import { SupportChatBox } from "@/components/support/support-chat-box";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Headphones,
  Search,
  RefreshCw,
  Clock,
  CheckCircle2,
  Lock,
  MessageSquare,
  School as SchoolIcon,
  User,
  Filter,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  LifeBuoy,
} from "lucide-react";

export default function SuperAdminSupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [stats, setStats] = useState<SupportTicketStats | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [schoolFilter, setSchoolFilter] = useState("ALL");
  const [roleFilter, setRoleFilter] = useState("ALL");

  const loadData = useCallback(
    async (showLoading = false) => {
      if (showLoading) setLoading(true);
      setRefreshing(true);
      try {
        const filters: SupportTicketFilters = {
          status: statusFilter,
          priority: priorityFilter,
          category: categoryFilter,
          school_id: schoolFilter,
          role: roleFilter,
          search: search.trim() || undefined,
        };

        const [ticketsData, statsData] = await Promise.all([
          getSupportTickets(filters),
          getSupportTicketStats(),
        ]);

        setTickets(ticketsData);
        setStats(statsData);

        // Keep selected ticket in sync only if already explicitly selected by super admin
        if (selectedTicket) {
          const updated = ticketsData.find((t) => t.id === selectedTicket.id);
          if (updated) setSelectedTicket(updated);
        }
      } catch (err: any) {
        console.error("Error fetching support data:", err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [statusFilter, priorityFilter, categoryFilter, schoolFilter, roleFilter, search, selectedTicket?.id]
  );

  useEffect(() => {
    loadData(true);
    // Poll every 5 seconds for incoming tickets & updates
    const interval = setInterval(() => {
      loadData(false);
    }, 5000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleTicketUpdated = (updated: SupportTicket) => {
    setSelectedTicket(updated);
    setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    getSupportTicketStats().then(setStats).catch(() => {});
  };

  const handleQuickAccept = async (e: React.MouseEvent, ticket: SupportTicket) => {
    e.stopPropagation();
    try {
      const updated = await acceptSupportTicket(ticket.id);
      handleTicketUpdated(updated);
      toast.success("Ticket Accepted", {
        description: `Chat opened for #${updated.ticket_number}.`,
      });
    } catch (err: any) {
      toast.error("Failed to accept ticket", { description: err.message });
    }
  };

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return "bg-rose-100 text-rose-800 border-rose-200";
      case "HIGH":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "MEDIUM":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const filterSelectClass = () =>
    "h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 focus:border-[#5826df] focus:outline-none focus:ring-2 focus:ring-[#5826df]/20";

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ─── Hero Banner ──────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#5826df] via-[#6d3df5] to-[#7f4efb] text-white p-6 md:p-7 shadow-lg shadow-purple-500/10">
        <div className="absolute right-0 top-0 -mt-8 -mr-8 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold text-purple-100 mb-3 border border-white/20">
              <Headphones className="w-3.5 h-3.5 text-emerald-300" />
              Central Super Admin Support & Helpdesk
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Support Tickets & Live Chat
            </h1>
            <p className="text-purple-100 text-xs md:text-sm mt-1 max-w-2xl font-normal leading-relaxed">
              Accept incoming tickets from Trustees, Principals, Teachers, Clerks, and Finance across all schools. Manage real-time live support chat and issue resolution.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadData(false)}
              disabled={refreshing || loading}
              className="bg-white/10 hover:bg-white/20 text-white border-white/30 backdrop-blur-sm transition-all text-xs font-semibold"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
              Refresh Queue
            </Button>
          </div>
        </div>
      </div>

      {/* ─── Stats KPI Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Tickets */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-lg shrink-0">
            <LifeBuoy className="w-6 h-6 text-[#5826df]" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Total Tickets</p>
            <p className="text-xl md:text-2xl font-black text-slate-900">
              {stats?.total_count ?? 0}
            </p>
          </div>
        </div>

        {/* Pending Acceptance */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-lg shrink-0">
            <Clock className="w-6 h-6 text-amber-600 animate-pulse" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Pending Acceptance</p>
            <p className="text-xl md:text-2xl font-black text-amber-600">
              {stats?.pending_count ?? 0}
            </p>
          </div>
        </div>

        {/* In Progress (Chat Open) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg shrink-0">
            <MessageSquare className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">In Live Chat</p>
            <p className="text-xl md:text-2xl font-black text-emerald-600">
              {stats?.in_progress_count ?? 0}
            </p>
          </div>
        </div>

        {/* Closed / Resolved */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-lg shrink-0">
            <CheckCircle2 className="w-6 h-6 text-slate-600" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Closed & Resolved</p>
            <p className="text-xl md:text-2xl font-black text-slate-700">
              {stats?.closed_count ?? 0}
            </p>
          </div>
        </div>
      </div>

      {/* ─── Filter Bar ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5826df]" />
          <input
            type="text"
            placeholder="Search tickets by #, subject, requester, school..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 h-9 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700 focus:border-[#5826df] focus:outline-none focus:ring-2 focus:ring-[#5826df]/20"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={filterSelectClass()}
          >
            <option value="ALL">Status: All ({stats?.total_count || 0})</option>
            <option value="PENDING">Pending Acceptance ({stats?.pending_count || 0})</option>
            <option value="IN_PROGRESS">In Progress ({stats?.in_progress_count || 0})</option>
            <option value="CLOSED">Closed ({stats?.closed_count || 0})</option>
          </select>

          {/* School Dropdown */}
          <select
            value={schoolFilter}
            onChange={(e) => setSchoolFilter(e.target.value)}
            className={filterSelectClass()}
          >
            <option value="ALL">School: All ({stats?.schools?.length || 0})</option>
            {stats?.schools?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Priority Dropdown */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className={filterSelectClass()}
          >
            <option value="ALL">Priority: All</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          {/* Role Dropdown */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className={filterSelectClass()}
          >
            <option value="ALL">Role: All</option>
            <option value="PRINCIPAL">Principal</option>
            <option value="TRUSTEE">Trustee</option>
            <option value="TEACHER">Teacher</option>
            <option value="CLERK">Clerk</option>
            <option value="FEES_MANAGEMENT">Fees Management</option>
            <option value="INVENTORY">Inventory</option>
          </select>

          {(search || statusFilter !== "ALL" || priorityFilter !== "ALL" || schoolFilter !== "ALL" || roleFilter !== "ALL") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setStatusFilter("ALL");
                setPriorityFilter("ALL");
                setSchoolFilter("ALL");
                setRoleFilter("ALL");
              }}
              className="h-9 px-3 text-xs text-purple-600 hover:text-purple-800"
            >
              Clear filters
            </Button>
          )}
        </div>
      </div>

      {/* ─── 2-Column Responsive Workspace ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[720px]">
        {/* Left Column: Ticket Queue (5 cols) */}
        <div className="lg:col-span-5 flex flex-col h-full bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <LifeBuoy className="w-4 h-4 text-purple-600" /> Ticket Queue ({tickets.length})
            </span>
            <span className="text-[11px] text-slate-400 font-medium">Click card to open chat</span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 divide-y divide-slate-100">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-3.5 rounded-xl border border-slate-100 space-y-2 animate-pulse">
                  <div className="h-4 w-24 bg-slate-100 rounded" />
                  <div className="h-5 w-3/4 bg-slate-100 rounded" />
                  <div className="h-3.5 w-1/2 bg-slate-100 rounded" />
                </div>
              ))
            ) : tickets.length === 0 ? (
              <div className="py-16 text-center text-slate-400 space-y-2">
                <LifeBuoy className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-xs font-medium text-slate-600">No support tickets found</p>
                <p className="text-[11px] text-slate-400">Incoming tickets will appear here automatically.</p>
              </div>
            ) : (
              tickets.map((t) => {
                const isSelected = selectedTicket?.id === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTicket(t)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer relative ${
                      isSelected
                        ? "bg-purple-50/70 border-purple-300 shadow-xs ring-1 ring-purple-400/30"
                        : "bg-white border-slate-200 hover:border-purple-200 hover:bg-slate-50/60"
                    }`}
                  >
                    {/* Top row: Ticket # & Status */}
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="font-mono text-xs font-bold text-purple-700">
                        #{t.ticket_number}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.2 rounded-full border ${getPriorityBadgeClass(
                            t.priority
                          )}`}
                        >
                          {t.priority}
                        </span>

                        {t.status === "PENDING" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            <Clock className="w-2.5 h-2.5 animate-spin" /> Pending
                          </span>
                        )}
                        {t.status === "IN_PROGRESS" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Chat
                          </span>
                        )}
                        {t.status === "CLOSED" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            Closed
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Subject */}
                    <h3 className="font-bold text-xs md:text-sm text-slate-900 line-clamp-1 mb-1">
                      {t.subject}
                    </h3>

                    {/* Requester & School */}
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mb-2">
                      <span className="flex items-center gap-1 font-medium text-slate-700 truncate max-w-[200px]">
                        <User className="w-3 h-3 text-purple-600 shrink-0" />
                        {t.creator_display_name || t.requester_name} ({t.requester_role})
                      </span>
                      <span className="text-slate-400 truncate max-w-[140px]">
                        {t.school_name || "Enterprise"}
                      </span>
                    </div>

                    {/* Footer Row: Quick Accept CTA */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-400">
                      <span>{new Date(t.created_at).toLocaleDateString()} {new Date(t.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>

                      {t.status === "PENDING" && (
                        <Button
                          size="sm"
                          onClick={(e) => handleQuickAccept(e, t)}
                          className="h-6 px-2.5 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md shadow-xs"
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Accept & Chat
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Interactive Chat Box (7 cols) */}
        <div className="lg:col-span-7 h-full">
          {selectedTicket ? (
            <SupportChatBox
              ticket={selectedTicket}
              isSuperAdmin={true}
              onTicketUpdated={handleTicketUpdated}
              className="h-full"
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400">
              <MessageSquare className="w-12 h-12 text-slate-300 mb-3" />
              <p className="text-base font-bold text-slate-700">Select a support ticket</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Choose any ticket from the queue on the left to accept it and start chatting in real time.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
