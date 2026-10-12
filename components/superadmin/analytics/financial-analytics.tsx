"use client";

import React from "react";
import Link from "next/link";
import { CreditCard, Wallet, BadgePercent, ArrowUpRight, ShieldCheck } from "lucide-react";
import type { FinancialMetrics } from "./types";

interface FinancialAnalyticsProps {
  metrics: FinancialMetrics | null;
  loading?: boolean;
}

export function FinancialAnalytics({ metrics, loading }: FinancialAnalyticsProps) {
  if (!metrics && !loading) {
    return null;
  }

  const feeCollectionRate =
    metrics && metrics.totalStudentFees > 0
      ? Math.round((metrics.collectedStudentFees / metrics.totalStudentFees) * 100)
      : 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600 shadow-2xs">
                <CreditCard className="h-4 w-4" />
              </span>
              <h3 className="text-base font-bold text-slate-900">Financial Analytics</h3>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              Platform SaaS subscriptions and student fee collection telemetry
            </p>
          </div>
          <Link
            href="/superadmin/subscriptions"
            className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline"
          >
            Manage Subscriptions <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Informative distinction banner */}
        <div className="mb-4 rounded-xl border border-indigo-100 bg-indigo-50/40 p-3 text-xs flex items-start gap-2.5">
          <ShieldCheck className="h-4 w-4 shrink-0 text-indigo-600 mt-0.5" />
          <p className="text-[11px] leading-relaxed text-slate-600">
            <strong className="text-slate-900">Category Segregation:</strong> Platform subscription revenue represents SaaS license fees paid by school trustees to VidyaSanchalan, whereas student fee collections represent academic dues collected by individual schools.
          </p>
        </div>

        {loading || !metrics ? (
          <div className="flex h-44 items-center justify-center text-xs text-slate-500">
            Loading financial telemetry…
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {/* SaaS Subscription Revenue Box */}
            <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-4 shadow-2xs">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600 mb-2">
                <span className="flex items-center gap-1.5 uppercase tracking-wider text-[10px] text-amber-800">
                  <BadgePercent className="h-3.5 w-3.5 text-amber-600" />
                  Platform Subscription Revenue
                </span>
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-black text-amber-800">
                  {metrics.activeSubscriptionsCount} Paid
                </span>
              </div>
              <p className="text-2xl font-black text-slate-900 tabular-nums">
                ₹{metrics.monthlySubscriptionRevenue.toLocaleString("en-IN")}
                <span className="text-xs font-semibold text-slate-500 ml-1">/ month</span>
              </p>
              <div className="mt-3 space-y-1.5 text-xs border-t border-amber-200/60 pt-2">
                <div className="flex justify-between">
                  <span className="text-slate-600">Projected Annual:</span>
                  <span className="font-bold text-slate-900">
                    ₹{metrics.annualSubscriptionRevenue.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Trial Accounts:</span>
                  <span className="font-bold text-slate-900">{metrics.trialSubscriptionsCount} schools</span>
                </div>
              </div>
            </div>

            {/* School Student Fee Collections Box */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 shadow-2xs">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600 mb-2">
                <span className="flex items-center gap-1.5 uppercase tracking-wider text-[10px] text-slate-700">
                  <Wallet className="h-3.5 w-3.5 text-emerald-600" />
                  School Student Fees
                </span>
                <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-black text-emerald-700 border border-emerald-200/60">
                  {feeCollectionRate}% Collected
                </span>
              </div>
              <p className="text-2xl font-black text-slate-900 tabular-nums">
                ₹{metrics.collectedStudentFees.toLocaleString("en-IN")}
              </p>

              {/* Progress bar */}
              <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${feeCollectionRate}%` }}
                />
              </div>

              <div className="mt-3 space-y-1.5 text-xs border-t border-slate-200 pt-2">
                <div className="flex justify-between">
                  <span className="text-slate-600">Total Assessed Fees:</span>
                  <span className="font-bold text-slate-900">
                    ₹{metrics.totalStudentFees.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Pending Student Fees:</span>
                  <span className="font-bold text-rose-600">
                    ₹{metrics.pendingStudentFees.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
        <span>Audited figures strictly aggregated from live database billing records</span>
        <span className="font-bold text-indigo-600">INR (₹) Standard</span>
      </div>
    </div>
  );
}
