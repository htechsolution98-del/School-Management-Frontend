"use client";

import React from "react";
import Link from "next/link";
import { CreditCard, Wallet, BadgePercent, ArrowUpRight, ShieldCheck, AlertCircle } from "lucide-react";
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
    <div className="rounded-2xl border border-[#E5EAE5] bg-white p-6 shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-[#16834A]">
                <CreditCard className="h-4 w-4" />
              </span>
              <h3 className="text-base font-bold text-[#202923]">Financial Analytics</h3>
            </div>
            <p className="mt-0.5 text-xs text-[#687568]">
              Platform SaaS subscriptions and student fee collection telemetry
            </p>
          </div>
          <Link
            href="/superadmin/subscriptions"
            className="inline-flex items-center gap-1 text-xs font-bold text-[#16834A] hover:underline"
          >
            Manage Subscriptions <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Informative distinction banner */}
        <div className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50/40 p-3 text-xs text-[#202923] flex items-start gap-2.5">
          <ShieldCheck className="h-4 w-4 shrink-0 text-[#16834A] mt-0.5" />
          <p className="text-[11px] leading-relaxed text-[#687568]">
            <strong className="text-[#202923]">Category Segregation:</strong> Platform subscription revenue represents SaaS license fees paid by school trustees to VidyaSanchalan, whereas student fee collections represent academic dues collected by individual schools.
          </p>
        </div>

        {loading || !metrics ? (
          <div className="flex h-44 items-center justify-center text-xs text-[#687568]">
            Loading financial telemetry…
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {/* SaaS Subscription Revenue Box */}
            <div className="rounded-xl border border-[#E5EAE5] bg-[#F7F8F5] p-4">
              <div className="flex items-center justify-between text-xs font-bold text-[#687568] mb-2">
                <span className="flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                  <BadgePercent className="h-3.5 w-3.5 text-[#16834A]" />
                  Platform Subscription Revenue
                </span>
                <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-black text-emerald-800">
                  {metrics.activeSubscriptionsCount} Paid
                </span>
              </div>
              <p className="text-2xl font-black text-[#202923] tabular-nums">
                ₹{metrics.monthlySubscriptionRevenue.toLocaleString("en-IN")}
                <span className="text-xs font-semibold text-[#687568] ml-1">/ month</span>
              </p>
              <div className="mt-3 space-y-1.5 text-xs border-t border-[#E5EAE5] pt-2">
                <div className="flex justify-between">
                  <span className="text-[#687568]">Projected Annual:</span>
                  <span className="font-bold text-[#202923]">
                    ₹{metrics.annualSubscriptionRevenue.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#687568]">Trial Accounts:</span>
                  <span className="font-bold text-[#202923]">{metrics.trialSubscriptionsCount} schools</span>
                </div>
              </div>
            </div>

            {/* School Student Fee Collections Box */}
            <div className="rounded-xl border border-[#E5EAE5] bg-[#F7F8F5] p-4">
              <div className="flex items-center justify-between text-xs font-bold text-[#687568] mb-2">
                <span className="flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                  <Wallet className="h-3.5 w-3.5 text-emerald-600" />
                  School Student Fees
                </span>
                <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-black text-[#16834A]">
                  {feeCollectionRate}% Collected
                </span>
              </div>
              <p className="text-2xl font-black text-[#202923] tabular-nums">
                ₹{metrics.collectedStudentFees.toLocaleString("en-IN")}
              </p>

              {/* Progress bar */}
              <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-[#E5EAE5]">
                <div
                  className="h-full rounded-full bg-[#16834A] transition-all duration-500"
                  style={{ width: `${feeCollectionRate}%` }}
                />
              </div>

              <div className="mt-3 space-y-1.5 text-xs border-t border-[#E5EAE5] pt-2">
                <div className="flex justify-between">
                  <span className="text-[#687568]">Total Assessed Fees:</span>
                  <span className="font-bold text-[#202923]">
                    ₹{metrics.totalStudentFees.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#687568]">Pending Student Fees:</span>
                  <span className="font-bold text-[#DC2626]">
                    ₹{metrics.pendingStudentFees.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-[#E5EAE5] text-xs text-[#687568] flex items-center justify-between">
        <span>Audited figures strictly aggregated from live database billing records</span>
        <span className="font-bold text-[#16834A]">INR (₹) Standard</span>
      </div>
    </div>
  );
}
