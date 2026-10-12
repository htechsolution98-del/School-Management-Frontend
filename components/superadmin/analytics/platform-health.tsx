"use client";

import React from "react";
import Link from "next/link";
import {
  ShieldAlert,
  AlertTriangle,
  Clock,
  Headphones,
  History,
  ArrowUpRight,
  CheckCircle2,
  Building2,
  Lock,
} from "lucide-react";
import type { SupportTicketStats, ActivityLogItem } from "./types";

interface PlatformHealthProps {
  inactiveSchoolsCount: number;
  expiringSubscriptionsCount: number;
  expiredSubscriptionsCount: number;
  ticketStats: SupportTicketStats | null;
  recentActivity: ActivityLogItem[];
  loading?: boolean;
}

export function PlatformHealth({
  inactiveSchoolsCount,
  expiringSubscriptionsCount,
  expiredSubscriptionsCount,
  ticketStats,
  recentActivity,
  loading = false,
}: PlatformHealthProps) {
  const openTicketsCount = ticketStats
    ? ticketStats.pending_count + ticketStats.in_progress_count
    : 0;

  const alerts = [
    {
      id: "inactive-schools",
      title: "Inactive School Tenants",
      count: inactiveSchoolsCount,
      severity: inactiveSchoolsCount > 0 ? ("warning" as const) : ("info" as const),
      desc:
        inactiveSchoolsCount > 0
          ? `${inactiveSchoolsCount} school instances currently inactive or pending review`
          : "All registered school instances are currently active",
      href: "/superadmin/schools",
      actionText: "Review Schools",
      icon: Building2,
    },
    {
      id: "expired-subs",
      title: "Expired / Overdue Subscriptions",
      count: expiredSubscriptionsCount,
      severity: expiredSubscriptionsCount > 0 ? ("error" as const) : ("info" as const),
      desc:
        expiredSubscriptionsCount > 0
          ? `${expiredSubscriptionsCount} school subscriptions past due date or expired`
          : "Zero overdue subscription accounts",
      href: "/superadmin/subscriptions",
      actionText: "Manage Billing",
      icon: Lock,
    },
    {
      id: "expiring-subs",
      title: "Subscriptions Expiring Soon",
      count: expiringSubscriptionsCount,
      severity: expiringSubscriptionsCount > 0 ? ("warning" as const) : ("info" as const),
      desc:
        expiringSubscriptionsCount > 0
          ? `${expiringSubscriptionsCount} subscriptions due within the next 30 days`
          : "No subscriptions expiring in the next 30 days",
      href: "/superadmin/subscriptions",
      actionText: "Send Invoices",
      icon: Clock,
    },
    {
      id: "support-tickets",
      title: "Open Support Tickets",
      count: openTicketsCount,
      severity: openTicketsCount > 0 ? ("warning" as const) : ("info" as const),
      desc:
        openTicketsCount > 0
          ? `${openTicketsCount} tickets awaiting resolution (${ticketStats?.pending_count || 0} pending)`
          : "Support queue cleared with 0 pending requests",
      href: "/superadmin/support",
      actionText: "Open Helpdesk",
      icon: Headphones,
    },
  ];

  const severityBadges = {
    error: "bg-red-50 text-[#DC2626] border-red-200",
    warning: "bg-amber-50 text-[#E99A32] border-amber-200",
    info: "bg-emerald-50 text-[#16834A] border-emerald-200",
  };

  return (
    <div className="rounded-2xl border border-[#E5EAE5] bg-white p-6 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-[#16834A]">
              <ShieldAlert className="h-4 w-4" />
            </span>
            <h3 className="text-base font-bold text-[#202923]">Platform Health & Alerts</h3>
          </div>
          <p className="mt-0.5 text-xs text-[#687568]">
            Real-time operational monitoring, license expiration, and support escalations
          </p>
        </div>
        <Link
          href="/superadmin/activity-logs"
          className="inline-flex items-center gap-1 text-xs font-bold text-[#16834A] hover:underline"
        >
          View Full Audit Log <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-[#687568]">
          Checking operational health status…
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-4 sm:grid-cols-2">
          {alerts.map((alert) => {
            const Icon = alert.icon;
            return (
              <div
                key={alert.id}
                className="rounded-xl border border-[#E5EAE5] bg-[#F7F8F5] p-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-[#E5EAE5] text-[#202923]">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span
                      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold ${
                        severityBadges[alert.severity]
                      }`}
                    >
                      {alert.count} {alert.count === 1 ? "Item" : "Items"}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-[#202923]">{alert.title}</h4>
                  <p className="mt-1 text-[11px] text-[#687568] leading-relaxed">
                    {alert.desc}
                  </p>
                </div>

                <div className="mt-4 pt-2.5 border-t border-[#E5EAE5]/70">
                  <Link
                    href={alert.href}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#16834A] hover:underline"
                  >
                    {alert.actionText} <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Recent Admin Activity Preview */}
      {recentActivity && recentActivity.length > 0 && (
        <div className="mt-6 pt-5 border-t border-[#E5EAE5]">
          <div className="flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wider text-[#687568]">
            <History className="h-3.5 w-3.5 text-[#16834A]" />
            Recent Administrative Activity Log
          </div>
          <div className="divide-y divide-[#E5EAE5]/60 rounded-xl border border-[#E5EAE5] bg-[#F7F8F5] overflow-hidden">
            {recentActivity.slice(0, 3).map((act) => (
              <div
                key={act.id}
                className="flex flex-wrap items-center justify-between gap-3 p-3 text-xs hover:bg-white transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <span className="h-2 w-2 rounded-full bg-[#16834A]" />
                  <div>
                    <span className="font-bold text-[#202923]">{act.user_name || "Admin"}</span>
                    <span className="text-[#687568] ml-1.5">{act.title || act.action}</span>
                    {act.school_name && (
                      <span className="ml-2 rounded-md bg-white border border-[#E5EAE5] px-1.5 py-0.5 text-[10px] font-semibold text-[#202923]">
                        {act.school_name}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-[11px] text-[#687568]">
                  {new Date(act.created_at).toLocaleString("en-IN", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
