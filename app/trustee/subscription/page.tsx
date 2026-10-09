"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  getCurrentSchoolSubscription,
  getPublicPlans,
  SchoolSubscription,
  SubscriptionPlan,
} from "@/lib/subscriptions";
import {
  CreditCard,
  Clock,
  Sparkles,
  CheckCircle2,
  Calendar,
  AlertCircle,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function TrusteeSubscriptionPage() {
  const [sub, setSub] = useState<SchoolSubscription | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [subData, plansData] = await Promise.all([
          getCurrentSchoolSubscription().catch(() => null),
          getPublicPlans().catch(() => []),
        ]);
        if (subData?.subscription) {
          setSub(subData.subscription);
        }
        setPlans(plansData);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
          <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
          <span>Loading subscription overview...</span>
        </div>
      </div>
    );
  }

  const daysLeft = sub?.days_left ?? 0;
  const activePlan = plans[0];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-indigo-600" />
            School Subscription & Billing
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your school ERP plan, view active license duration, and process term renewals.
          </p>
        </div>

        <Link
          href={`/trustee/subscription/checkout?plan=${activePlan?.id || sub?.plan || ""}&cycle=YEARLY`}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Renew Subscription</span>
        </Link>
      </div>

      {/* Current Status Card */}
      {sub && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1.5">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Plan Status</div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-extrabold text-slate-900">
                {sub.status === "TRIAL" ? "Free Trial" : sub.status}
              </span>
              <Badge className={sub.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}>
                {sub.status === "ACTIVE" ? "Active" : `${daysLeft}d left`}
              </Badge>
            </div>
            <p className="text-[11px] text-slate-500">
              {sub.trial_end_date ? `Trial expires on ${sub.trial_end_date}` : `Due on ${sub.due_date}`}
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1.5">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pricing Model</div>
            <div className="text-lg font-extrabold text-slate-900">
              {sub.billing_model === "PER_STUDENT" ? "Per Student Billing" : "Flat School License"}
            </div>
            <p className="text-[11px] text-slate-500">
              Rate: ₹{Number(sub.flat_amount || 5000).toLocaleString("en-IN")} / month
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1.5">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">School Organization</div>
            <div className="text-lg font-extrabold text-slate-900 truncate">{sub.school_name}</div>
            <p className="text-[11px] text-slate-500">Code: #{sub.school_code}</p>
          </div>
        </div>
      )}

      {/* Available Plans Grid */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Select Term & Renew Plan</h2>
          <span className="text-xs text-slate-400">Tailored plans for your school</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              cycle: "MONTHLY",
              name: "1-Month Plan",
              badge: "Monthly",
              badgeColor: "bg-slate-100 text-slate-700",
              price: activePlan ? activePlan.monthly_price : sub?.flat_amount || 5000,
              duration: "30 Days Access",
            },
            {
              cycle: "QUARTERLY",
              name: "3-Month Plan",
              badge: "Quarterly",
              badgeColor: "bg-blue-50 text-blue-700 border border-blue-100",
              price: activePlan ? activePlan.quarterly_price : (Number(sub?.flat_amount || 5000) * 3),
              duration: "90 Days Access",
            },
            {
              cycle: "HALF_YEARLY",
              name: "6-Month Plan",
              badge: "Half-Yearly",
              badgeColor: "bg-purple-50 text-purple-700 border border-purple-100",
              price: activePlan ? activePlan.half_yearly_price : (Number(sub?.flat_amount || 5000) * 6),
              duration: "180 Days Access",
            },
            {
              cycle: "YEARLY",
              name: "12-Month Plan",
              badge: "Best Value",
              badgeColor: "bg-emerald-100 text-emerald-800 font-bold",
              price: activePlan ? activePlan.yearly_price : (Number(sub?.flat_amount || 5000) * 12),
              duration: "365 Days Access",
            },
          ].map((tier) => (
            <div
              key={tier.cycle}
              className="bg-slate-50/70 rounded-2xl border border-slate-200 p-4 flex flex-col justify-between space-y-4 hover:border-indigo-400 transition-all shadow-2xs"
            >
              <div>
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${tier.badgeColor}`}>
                  {tier.badge}
                </span>
                <h3 className="text-sm font-extrabold text-slate-900 mt-2">{tier.name}</h3>
                <p className="text-[11px] text-slate-500 mb-3">{tier.duration}</p>
                <div className="text-2xl font-black text-slate-900">
                  ₹{Number(tier.price).toLocaleString("en-IN")}
                </div>
                <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
                  {activePlan?.gst_included ? `+ GST (${activePlan.gst_percentage || 18}%)` : "GST Excluded"}
                </div>
              </div>

              <Link
                href={`/trustee/subscription/checkout?plan=${activePlan?.id || sub?.plan || ""}&cycle=${tier.cycle}`}
                className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold text-center shadow-xs transition-all flex items-center justify-center gap-1.5"
              >
                <span>Select & Renew</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
