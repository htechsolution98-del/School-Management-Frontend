"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { getCurrentSchoolSubscription, SchoolSubscription } from "@/lib/subscriptions";
import { AlertTriangle, Clock, ShieldAlert, Sparkles, ArrowRight } from "lucide-react";

export function TrialBanner() {
  const [sub, setSub] = useState<SchoolSubscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getCurrentSchoolSubscription();
        if (data && data.subscription) {
          setSub(data.subscription);
        }
      } catch (e) {
        // user might not be logged in or not associated with a school
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading || !sub) return null;

  // Render for TRIAL or EXPIRING or EXPIRED or GRACE_PERIOD or SUSPENDED
  if (sub.status === "ACTIVE") return null;

  const daysLeft = sub.days_left;
  let bgClass = "bg-amber-500 text-white";
  let icon = <Clock className="w-5 h-5 animate-pulse" />;
  let title = `Free Trial Active — ${daysLeft} ${daysLeft === 1 ? "day" : "days"} remaining`;
  let ctaText = "Choose Plan & Subscribe";

  if (sub.status === "TRIAL_EXPIRED" || sub.status === "EXPIRED") {
    bgClass = "bg-red-600 text-white";
    icon = <AlertTriangle className="w-5 h-5" />;
    title = "Trial / Subscription Expired!";
    ctaText = "Renew Subscription Now";
  } else if (sub.status === "GRACE_PERIOD") {
    bgClass = "bg-orange-600 text-white";
    icon = <ShieldAlert className="w-5 h-5 animate-bounce" />;
    title = `Grace Period Active — Expires in ${daysLeft} days!`;
    ctaText = "Pay Now to Prevent Lock";
  } else if (sub.status === "SUSPENDED") {
    bgClass = "bg-slate-900 text-rose-400 border-b border-rose-500/30";
    icon = <ShieldAlert className="w-5 h-5 text-rose-500" />;
    title = "Account Suspended due to unpaid subscription.";
    ctaText = "Reactivate Subscription";
  } else if (daysLeft <= 3) {
    bgClass = "bg-rose-600 text-white";
    icon = <AlertTriangle className="w-5 h-5 animate-bounce" />;
    title = `Urgent: Free Trial ends in ${daysLeft} ${daysLeft === 1 ? "day" : "days"}!`;
    ctaText = "Upgrade Now";
  }

  return (
    <div className={`${bgClass} px-4 py-2.5 shadow-md flex flex-wrap items-center justify-between gap-3 text-sm font-medium transition-all`}>
      <div className="flex items-center gap-2.5">
        {icon}
        <span>{title}</span>
        {sub.plan_name && (
          <span className="hidden md:inline-block px-2 py-0.5 rounded-full bg-white/20 text-xs font-semibold">
            {sub.plan_name}
          </span>
        )}
      </div>

      <Link
        href="/admin/subscription/checkout"
        className="inline-flex items-center gap-1.5 bg-white text-slate-900 hover:bg-slate-100 px-3.5 py-1.5 rounded-md text-xs font-bold shadow-sm transition-all hover:scale-105 active:scale-95"
      >
        <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
        <span>{ctaText}</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
