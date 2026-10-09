"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { getCurrentSchoolSubscription, getPublicPlans, SchoolSubscription, SubscriptionPlan } from "@/lib/subscriptions";
import { AlertTriangle, Clock, ShieldAlert, Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export function TrialBanner() {
  const [sub, setSub] = useState<SchoolSubscription | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [isTrustee, setIsTrustee] = useState(false);

  useEffect(() => {
    // Check if current user has Trustee role
    try {
      const storedRoles = JSON.parse(localStorage.getItem("roles") || "[]");
      if (Array.isArray(storedRoles)) {
        const normalized = storedRoles.map((r: any) => String(r).toLowerCase().trim());
        const hasTrusteeRole = normalized.includes("admin(trustee)") || normalized.includes("trustee");
        setIsTrustee(hasTrusteeRole);
        if (!hasTrusteeRole) {
          setLoading(false);
          return;
        }
      } else {
        setLoading(false);
        return;
      }
    } catch {
      setLoading(false);
      return;
    }

    async function loadData() {
      try {
        const [subData, plansData] = await Promise.all([
          getCurrentSchoolSubscription().catch(() => null),
          getPublicPlans().catch(() => []),
        ]);

        if (subData && subData.subscription) {
          setSub(subData.subscription);
        }
        if (plansData) {
          setPlans(plansData);
        }
      } catch (e) {
        // user might not be logged in or not associated with a school
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Only Trustee users see subscription trial / renewal notices
  if (!isTrustee || loading || !sub) return null;

  // Render for TRIAL or EXPIRING or EXPIRED or GRACE_PERIOD or SUSPENDED
  if (sub.status === "ACTIVE") return null;

  const daysLeft = sub.days_left ?? 0;
  let bgClass = "bg-gradient-to-r from-amber-500 via-amber-600 to-orange-500 text-white";
  let icon = <Clock className="w-5 h-5 animate-pulse" />;
  let title = `Free Trial Active — ${daysLeft} ${daysLeft === 1 ? "day" : "days"} remaining`;
  let ctaText = "View School Plans & Renew";

  if (sub.status === "TRIAL_EXPIRED" || sub.status === "EXPIRED") {
    bgClass = "bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white shadow-lg shadow-red-500/20";
    icon = <AlertTriangle className="w-5 h-5 animate-bounce" />;
    title = "Trial / Subscription Expired! Please renew to maintain uninterrupted access.";
    ctaText = "Renew Plan Now";
  } else if (sub.status === "GRACE_PERIOD") {
    bgClass = "bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg shadow-orange-500/20";
    icon = <ShieldAlert className="w-5 h-5 animate-bounce" />;
    title = `Grace Period Active — Account locks in ${daysLeft} days!`;
    ctaText = "Pay Now to Prevent Lock";
  } else if (sub.status === "SUSPENDED") {
    bgClass = "bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 text-rose-400 border-b border-rose-500/30";
    icon = <ShieldAlert className="w-5 h-5 text-rose-500" />;
    title = "Account Suspended due to unpaid subscription.";
    ctaText = "Reactivate Subscription";
  } else if (daysLeft <= 3) {
    bgClass = "bg-gradient-to-r from-rose-600 to-red-600 text-white animate-pulse";
    icon = <AlertTriangle className="w-5 h-5" />;
    title = `Urgent: Free Trial ends in ${daysLeft} ${daysLeft === 1 ? "day" : "days"}!`;
    ctaText = "Renew / Subscribe Now";
  }

  // Active plan for this school
  const activePlan = plans[0];

  return (
    <>
      {/* Banner Div on Screen */}
      <div className={`${bgClass} px-4 py-2.5 shadow-md flex flex-wrap items-center justify-between gap-3 text-sm font-medium transition-all sticky top-0 z-30`}>
        <div className="flex items-center gap-2.5 flex-wrap">
          {icon}
          <span className="font-semibold tracking-wide">{title}</span>
          {sub.plan_name && (
            <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-xs font-bold backdrop-blur-xs">
              {sub.plan_name}
            </span>
          )}
          {sub.trial_end_date && (
            <span className="text-xs text-white/90 font-medium">
              (Valid until: {sub.trial_end_date})
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1.5 bg-white text-slate-900 hover:bg-slate-100 px-3.5 py-1.5 rounded-lg text-xs font-black shadow-sm transition-all hover:scale-105 active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>{ctaText}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Subscription Plans Modal for this School */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-5xl md:max-w-6xl w-[96vw] !max-w-[1150px] p-0 overflow-hidden rounded-3xl border border-slate-200 shadow-2xl bg-slate-50/50 max-h-[92vh] flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white p-6 sm:p-7 relative overflow-hidden shrink-0">
            <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/30 text-indigo-200 text-xs font-bold uppercase tracking-wider mb-2 border border-indigo-400/20">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                  School Subscription Plans
                </div>
                <DialogTitle className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  Renew & Select Subscription Plan
                </DialogTitle>
                <DialogDescription className="text-indigo-200 text-xs sm:text-sm mt-1">
                  Choose a tailored plan duration created specifically for your school organization.
                </DialogDescription>
              </div>

              {/* Status Pill in Header */}
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-3 px-4 shrink-0 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-indigo-200 uppercase tracking-wider">Current Status</div>
                  <div className="text-sm font-black text-white">
                    {sub.status === "TRIAL" ? `Free Trial (${daysLeft}d left)` : sub.status}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Scrollable Content Body */}
          <div className="p-5 sm:p-7 space-y-6 overflow-y-auto flex-1">
            {/* Free trial summary alert */}
            <div className="bg-amber-50 border border-amber-200/90 rounded-2xl p-4 flex items-center justify-between flex-wrap gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-amber-950">
                    {sub.status === "TRIAL" ? "Free Trial In Progress" : "Subscription Renewal Required"}
                  </h4>
                  <p className="text-xs text-amber-800">
                    {sub.trial_end_date
                      ? `Active trial valid until ${sub.trial_end_date}. Renewing now extends your period seamlessly without data interruption.`
                      : "Choose a duration below to activate continuous school portal access."}
                  </p>
                </div>
              </div>
              <span className="px-3.5 py-1 rounded-full bg-amber-200/80 text-amber-950 font-extrabold text-xs">
                {daysLeft > 0 ? `${daysLeft} Days Remaining` : "Expired"}
              </span>
            </div>

            {/* 4 Plan Duration Cards: 1-Month, 3-Month, 6-Month, 12-Month */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Select Subscription Duration
                </h3>
                <span className="text-xs text-slate-400 font-medium">
                  Pricing model: <strong className="text-slate-700">{activePlan?.pricing_model === "PER_STUDENT" ? "Per Student" : "Flat School Rate"}</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  {
                    name: "1-Month Plan",
                    cycle: "MONTHLY",
                    badge: "Monthly",
                    badgeColor: "bg-slate-100 text-slate-700 border-slate-200",
                    borderStyle: "border-slate-200 hover:border-indigo-500 hover:shadow-lg",
                    price: activePlan ? activePlan.monthly_price : sub.flat_amount || 0,
                    duration: "30 Days Full Access",
                    subtext: "Billed monthly",
                    isFeatured: false,
                  },
                  {
                    name: "3-Month Plan",
                    cycle: "QUARTERLY",
                    badge: "Quarterly",
                    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
                    borderStyle: "border-blue-200 hover:border-blue-500 hover:shadow-lg",
                    price: activePlan ? activePlan.quarterly_price : Number(sub.flat_amount || 0) * 3,
                    duration: "90 Days Full Access",
                    subtext: "Billed quarterly",
                    isFeatured: false,
                  },
                  {
                    name: "6-Month Plan",
                    cycle: "HALF_YEARLY",
                    badge: "Half-Yearly",
                    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
                    borderStyle: "border-purple-200 hover:border-purple-500 hover:shadow-lg",
                    price: activePlan ? activePlan.half_yearly_price : Number(sub.flat_amount || 0) * 6,
                    duration: "180 Days Full Access",
                    subtext: "Billed semi-annually",
                    isFeatured: false,
                  },
                  {
                    name: "12-Month Plan",
                    cycle: "YEARLY",
                    badge: "Best Value",
                    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-300 font-black",
                    borderStyle: "border-emerald-400 ring-2 ring-emerald-500/20 shadow-md hover:border-emerald-500 hover:shadow-xl",
                    price: activePlan ? activePlan.yearly_price : Number(sub.flat_amount || 0) * 12,
                    duration: "365 Days Full Access",
                    subtext: "Billed annually (Best Savings)",
                    isFeatured: true,
                  },
                ].map((tier) => (
                  <div
                    key={tier.cycle}
                    className={`bg-white rounded-3xl border p-5 shadow-xs flex flex-col justify-between transition-all duration-200 relative group ${tier.borderStyle}`}
                  >
                    {tier.isFeatured && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider px-3 py-0.5 rounded-full shadow-sm">
                        Recommended
                      </div>
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full border ${tier.badgeColor}`}>
                          {tier.badge}
                        </span>
                      </div>

                      <h4 className="font-black text-slate-900 text-base tracking-tight">{tier.name}</h4>
                      <p className="text-[11px] text-slate-500 mb-4">{tier.duration}</p>

                      <div className="mb-4 pb-4 border-b border-slate-100">
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                            ₹{Number(tier.price).toLocaleString("en-IN")}
                          </span>
                        </div>
                        <div className="text-[11px] font-medium text-slate-400 mt-1 flex items-center justify-between">
                          <span>{tier.subtext}</span>
                          {activePlan?.gst_included ? (
                            <span className="text-[10px] text-indigo-600 font-bold">
                              + GST ({activePlan.gst_percentage || 18}%)
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">
                              GST Excluded
                            </span>
                          )}
                        </div>
                      </div>

                      <ul className="space-y-2 text-xs text-slate-600 mb-6 font-medium">
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="truncate">All SMS Modules Included</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="truncate">Automated Gradebooks & Exams</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="truncate">Fee Receipts & Accounting</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="truncate">24/7 Priority Support</span>
                        </li>
                      </ul>
                    </div>

                    <Link
                      href={`/trustee/subscription/checkout?plan=${activePlan?.id || sub.plan || ""}&cycle=${tier.cycle}`}
                      onClick={() => setModalOpen(false)}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold text-center shadow-xs transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
                        tier.isFeatured
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20"
                          : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20"
                      }`}
                    >
                      <span>Select & Continue</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-slate-100/90 p-4 px-7 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <p className="text-xs text-slate-500 text-center sm:text-left">
              Need a custom multi-campus plan or enterprise agreement? Contact your platform superadmin.
            </p>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-2xs"
            >
              Close
            </button>
          </div>
        </DialogContent>
      </Dialog>

    </>
  );
}

