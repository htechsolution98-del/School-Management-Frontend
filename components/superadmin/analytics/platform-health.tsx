"use client";

import React from "react";
import Link from "next/link";
import {
  ShieldAlert,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  Headphones,
  History,
  Lock,
} from "lucide-react";
import type { FinancialMetrics, ActivityLogItem } from "./types";

interface PlatformHealthProps {
  financialMetrics?: FinancialMetrics | null;
  inactiveSchoolsCount: number;
  expiringSubscriptionsCount?: number;
  expiredSubscriptionsCount?: number;
  ticketStats?: any;
  recentActivity?: ActivityLogItem[];
  loading?: boolean;
}

export function PlatformHealth({
  financialMetrics,
  inactiveSchoolsCount,
  expiringSubscriptionsCount,
  expiredSubscriptionsCount,
  ticketStats,
  recentActivity,
  loading = false,
}: PlatformHealthProps) {
  const expiredCount =
    expiredSubscriptionsCount !== undefined
      ? expiredSubscriptionsCount
      : financialMetrics?.expiredCount || 0;
  const expiringSoonCount =
    expiringSubscriptionsCount !== undefined
      ? expiringSubscriptionsCount
      : financialMetrics?.expiringSoonCount || 0;
  const ticketCount = ticketStats?.open || ticketStats?.pending || 0;

  const alerts = [
    {
      id: "expired",
      title: "Expired Subscriptions",
      desc: `${expiredCount} tenant institution${expiredCount === 1 ? "" : "s"} with expired license plans.`,
      severity: expiredCount > 0 ? "error" : "info",
      count: expiredCount,
      actionText: "Review billing",
      href: "/superadmin/subscriptions",
      icon: AlertTriangle,
    },
    {
      id: "expiring",
      title: "Expiring Within 15 Days",
      desc: `${expiringSoonCount} school account${expiringSoonCount === 1 ? "" : "s"} due for subscription renewal soon.`,
      severity: expiringSoonCount > 0 ? "warning" : "info",
      count: expiringSoonCount,
      actionText: "Send renewal alert",
      href: "/superadmin/subscriptions",
      icon: Clock,
    },
    {
      id: "inactive",
      title: "Inactive School Tenants",
      desc: `${inactiveSchoolsCount} school${inactiveSchoolsCount === 1 ? "" : "s"} marked inactive or pending onboarding.`,
      severity: inactiveSchoolsCount > 0 ? "warning" : "info",
      count: inactiveSchoolsCount,
      actionText: "Verify tenants",
      href: "/superadmin/schools",
      icon: Lock,
    },
    {
      id: "tickets",
      title: "Support Escalations",
      desc:
        ticketCount > 0
          ? `${ticketCount} open support ticket${ticketCount === 1 ? "" : "s"} requiring review.`
          : "All support tickets synchronized. System operational.",
      severity: ticketCount > 0 ? "warning" : "info",
      count: ticketCount,
      actionText: "Open desk",
      href: "/superadmin/support",
      icon: Headphones,
    },
  ];

  const severityBadges: Record<string, string> = {
    error: "bg-rose-50 text-rose-700 border-rose-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    info: "bg-indigo-50 text-indigo-700 border-indigo-200",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 shadow-2xs">
              <ShieldAlert className="h-4 w-4" />
            </span>
            <h3 className="text-base font-bold text-slate-900">Platform Health & Alerts</h3>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            Real-time operational monitoring, license expiration, and support escalations
          </p>
        </div>
        <Link
          href="/superadmin/activity-logs"
          className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline"
        >
          View Full Audit Log <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-slate-500">
          Checking operational health status…
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-4 sm:grid-cols-2">
          {alerts.map((alert) => {
            const Icon = alert.icon;
            return (
              <div
                key={alert.id}
                className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 flex flex-col justify-between overflow-hidden min-w-0"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-700 shadow-2xs">
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

                  <h4 className="text-xs font-bold text-slate-900">{alert.title}</h4>
                  <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
                    {alert.desc}
                  </p>
                </div>

                <div className="mt-4 pt-2.5 border-t border-slate-200">
                  <Link
                    href={alert.href}
                    className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline"
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
        <div className="mt-6 pt-5 border-t border-slate-100">
          <div className="flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
            <History className="h-3.5 w-3.5 text-indigo-600" />
            Recent Administrative Activity Log
          </div>
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-slate-50/50 overflow-hidden">
            {recentActivity.slice(0, 3).map((act) => (
              <div
                key={act.id}
                className="flex flex-wrap items-center justify-between gap-3 p-3 text-xs hover:bg-white transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <span className="h-2 w-2 rounded-full bg-indigo-600" />
                  <div>
                    <span className="font-bold text-slate-900">{act.user_name || "Admin"}</span>
                    <span className="text-slate-500 ml-1.5">{act.title || act.action}</span>
                    {act.school_name && (
                      <span className="ml-2 rounded-md bg-white border border-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-800">
                        {act.school_name}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-[11px] text-slate-400">
                  {act.created_at ? new Date(act.created_at).toLocaleTimeString() : "Just now"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
