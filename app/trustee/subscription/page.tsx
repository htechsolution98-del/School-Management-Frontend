"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  getCurrentSchoolSubscription,
  getPublicPlans,
  getSchoolInvoices,
  getSubscriptionPayments,
  deleteSchoolInvoice,
  formatDateSafe,
  formatDateTimeSafe,
  SchoolSubscription,
  SubscriptionPlan,
  SchoolInvoice,
  SubscriptionPayment,
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
  Building,
  FileText,
  Printer,
  Download,
  Check,
  ExternalLink,
  Layers,
  History,
  CheckCircle,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function TrusteeSubscriptionPage() {
  const [sub, setSub] = useState<SchoolSubscription | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [invoices, setInvoices] = useState<SchoolInvoice[]>([]);
  const [payments, setPayments] = useState<SubscriptionPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<SchoolInvoice | null>(null);
  const [activeTab, setActiveTab] = useState<"ALL" | "PAID" | "PENDING">("ALL");

  async function loadData() {
    setLoading(true);
    try {
      const [subData, plansData] = await Promise.all([
        getCurrentSchoolSubscription().catch(() => null),
        getPublicPlans().catch(() => []),
      ]);

      if (subData?.subscription) {
        setSub(subData.subscription);
      }
      setPlans(plansData);

      const [invData, payData] = await Promise.all([
        getSchoolInvoices().catch(() => []),
        getSubscriptionPayments().catch(() => []),
      ]);
      setInvoices(invData);
      setPayments(payData);
    } catch (err) {
      console.error("Failed to load subscription overview:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
          <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
          <span>Loading subscription overview & payment records...</span>
        </div>
      </div>
    );
  }

  const daysLeft = sub?.days_left ?? 0;
  const activePlan = plans[0];
  const monthlyRate = Number(activePlan ? activePlan.monthly_price : sub?.flat_amount || 5000);

  // Formatter helpers using robust multi-format date parser
  const formatDate = formatDateSafe;
  const formatDateTime = formatDateTimeSafe;
  const formatInvoiceId = (id?: string) => {
    if (!id) return "—";
    if (id.length <= 16) return id;
    const prefix = id.slice(0, 10);
    const suffix = id.slice(-4);
    return `${prefix}...${suffix}`;
  };

  async function handleCancelPending(invoiceId: number) {
    if (!confirm("Are you sure you want to cancel and remove this pending order?")) return;
    try {
      await deleteSchoolInvoice(invoiceId);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to remove pending order.");
    }
  }

  const paidInvoices = invoices.filter((i) => i.status === "PAID");
  const pendingInvoices = invoices.filter((i) => i.status === "PENDING");
  const totalPaidAmount = paidInvoices.reduce((sum, i) => sum + Number(i.total_amount || 0), 0);

  const displayedInvoices =
    activeTab === "PAID"
      ? paidInvoices
      : activeTab === "PENDING"
      ? pendingInvoices
      : invoices;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-indigo-600" />
            <span>School Subscription & Billing</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your school ERP plan, view active license duration & expanded days, and process term renewals.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadData}
            className="p-2 text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all"
            title="Refresh records"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link
            href={`/trustee/subscription/checkout?plan=${activePlan?.id || sub?.plan || (plans[0]?.id ?? "")}&cycle=MONTHLY&months=2`}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Renew / Expand Subscription</span>
          </Link>
        </div>
      </div>

      {/* Current Status & Validity Expansion Card */}
      {sub && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-indigo-600">
                  {sub.school_name} (#{sub.school_code})
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    sub.status === "ACTIVE"
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                      : sub.status === "TRIAL"
                      ? "bg-amber-100 text-amber-800 border border-amber-200"
                      : "bg-red-100 text-red-800 border border-red-200"
                  }`}
                >
                  {sub.status === "ACTIVE" ? "Active License" : sub.status === "TRIAL" ? "Free Trial Active" : sub.status}
                </span>
              </div>
              <h2 className="text-2xl font-black text-slate-900">
                {sub.plan_name || (sub.plan_type === "TRIAL" ? "Evaluation Trial Plan" : "Standard School License")}
              </h2>
            </div>

            <div className="bg-indigo-50/80 border border-indigo-100 rounded-2xl p-4 sm:text-right shrink-0">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Active Days Remaining
              </div>
              <div className="text-2xl font-black text-indigo-700">
                {daysLeft > 0 ? `${daysLeft} Days` : "Expired"}
              </div>
              <div className="text-[11px] font-semibold text-slate-600 mt-0.5">
                Valid Until: <span className="font-bold text-slate-900">{formatDate(sub.due_date)}</span>
              </div>
            </div>
          </div>

          {/* Quick Expand Term Stacking Buttons */}
          <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">
                  Active Coverage: {formatDate(sub.start_date || sub.subscription_start_date)} → {formatDate(sub.due_date)}
                </div>
                <div className="text-[11px] text-slate-500">
                  Purchasing any term automatically stacks and expands your active validity period.
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-slate-500 mr-1">Quick Expand:</span>
              <Link
                href={`/trustee/subscription/checkout?plan=${activePlan?.id || sub.plan || (plans[0]?.id ?? "")}&cycle=MONTHLY&months=1`}
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:border-indigo-500 hover:text-indigo-600 text-xs font-bold shadow-2xs transition-all"
              >
                +1 Month
              </Link>
              <Link
                href={`/trustee/subscription/checkout?plan=${activePlan?.id || sub.plan || (plans[0]?.id ?? "")}&cycle=MONTHLY&months=2`}
                className="px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 text-xs font-black shadow-2xs transition-all"
              >
                +2 Months (60 Days)
              </Link>
              <Link
                href={`/trustee/subscription/checkout?plan=${activePlan?.id || sub.plan || (plans[0]?.id ?? "")}&cycle=QUARTERLY&months=3`}
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:border-indigo-500 hover:text-indigo-600 text-xs font-bold shadow-2xs transition-all"
              >
                +3 Months
              </Link>
              <Link
                href={`/trustee/subscription/checkout?plan=${activePlan?.id || sub.plan || (plans[0]?.id ?? "")}&cycle=YEARLY&months=12`}
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:border-indigo-500 hover:text-indigo-600 text-xs font-bold shadow-2xs transition-all"
              >
                +1 Year
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Select Term & Renew Plan Grid */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Select Term Duration to Buy or Renew</h2>
            <p className="text-xs text-slate-400">Choose multi-month durations or full annual plans</p>
          </div>
          <span className="text-xs text-indigo-600 font-semibold flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            Razorpay Instant Gateway Enabled
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {[
            {
              cycle: "MONTHLY",
              months: 1,
              name: "1-Month Plan",
              badge: "Monthly",
              badgeColor: "bg-slate-100 text-slate-700",
              price: monthlyRate,
              duration: "30 Days Access",
            },
            {
              cycle: "MONTHLY",
              months: 2,
              name: "2-Month Plan",
              badge: "Popular Stacking",
              badgeColor: "bg-indigo-100 text-indigo-800 font-bold",
              price: monthlyRate * 2,
              duration: "60 Days Expanded Access",
            },
            {
              cycle: "QUARTERLY",
              months: 3,
              name: "3-Month Plan",
              badge: "Quarterly",
              badgeColor: "bg-blue-50 text-blue-700 border border-blue-100",
              price: activePlan ? activePlan.quarterly_price : monthlyRate * 3,
              duration: "90 Days Term Access",
            },
            {
              cycle: "HALF_YEARLY",
              months: 6,
              name: "6-Month Plan",
              badge: "Half-Yearly",
              badgeColor: "bg-purple-50 text-purple-700 border border-purple-100",
              price: activePlan ? activePlan.half_yearly_price : monthlyRate * 6,
              duration: "180 Days Term Access",
            },
            {
              cycle: "YEARLY",
              months: 12,
              name: "12-Month Plan",
              badge: "Best Value",
              badgeColor: "bg-emerald-100 text-emerald-800 font-bold",
              price: activePlan ? activePlan.yearly_price : monthlyRate * 12,
              duration: "365 Days Access",
            },
          ].map((tier) => (
            <div
              key={tier.name}
              className="bg-slate-50/70 rounded-2xl border border-slate-200 p-4 flex flex-col justify-between space-y-4 hover:border-indigo-400 hover:shadow-xs transition-all"
            >
              <div>
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${tier.badgeColor}`}>
                  {tier.badge}
                </span>
                <h3 className="text-sm font-extrabold text-slate-900 mt-2">{tier.name}</h3>
                <p className="text-[11px] text-slate-500 mb-2">{tier.duration}</p>
                <div className="text-xl font-black text-slate-900">
                  ₹{Number(tier.price).toLocaleString("en-IN")}
                </div>
                <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
                  {tier.months} Month{tier.months > 1 ? "s" : ""} Validity
                </div>
              </div>

              <Link
                href={`/trustee/subscription/checkout?plan=${activePlan?.id || sub?.plan || (plans[0]?.id ?? "")}&cycle=${tier.cycle}&months=${tier.months}`}
                className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold text-center shadow-xs transition-all flex items-center justify-center gap-1.5"
              >
                <span>Buy / Renew</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Purchased Subscriptions & Payment History */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden space-y-4 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-600" />
              <span>Purchased Subscriptions & Payment History</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Verified record of all past and active subscriptions bought with Razorpay gateway receipts.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
              {invoices.length} Total Purchased Record{invoices.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        {/* Metric Badges for Past Subscriptions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Invoices</div>
              <div className="text-xl font-black text-slate-900 mt-0.5">{invoices.length}</div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-600 flex items-center justify-center font-bold">
              <FileText className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Paid & Active Subscriptions</div>
              <div className="text-xl font-black text-emerald-700 mt-0.5">
                {paidInvoices.length} <span className="text-xs font-semibold text-emerald-600">(₹{totalPaidAmount.toLocaleString("en-IN")})</span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Pending Checkout Orders</div>
              <div className="text-xl font-black text-amber-700 mt-0.5">{pendingInvoices.length}</div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 border-b border-slate-200 pt-2 pb-1">
          <button
            type="button"
            onClick={() => setActiveTab("ALL")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === "ALL"
                ? "bg-indigo-600 text-white shadow-2xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            All Subscriptions ({invoices.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("PAID")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === "PAID"
                ? "bg-emerald-600 text-white shadow-2xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            Paid & Active ({paidInvoices.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("PENDING")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === "PENDING"
                ? "bg-amber-600 text-white shadow-2xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            Pending Orders ({pendingInvoices.length})
          </button>
        </div>

        {displayedInvoices.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">No {activeTab.toLowerCase()} subscription records found.</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Purchases processed through Razorpay or recorded by admin will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[960px] text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200 text-[10px]">
                <tr>
                  <th className="py-3 px-3.5 whitespace-nowrap">Invoice #</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Plan & Duration</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Amount</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Payment Method</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Transaction ID</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Purchase Date</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Valid Coverage Period</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Status</th>
                  <th className="py-3 px-3.5 whitespace-nowrap text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {displayedInvoices.map((inv) => {
                  const isPaid = inv.status === "PAID";
                  const isRazorpay =
                    inv.payment_method === "ONLINE" ||
                    (inv.payment_reference && (inv.payment_reference.startsWith("pay_") || inv.payment_reference.startsWith("order_")));

                  // Extract months count from cycle if available
                  const cycleMonths = inv.billing_cycle.includes("_MONTHS")
                    ? Number(inv.billing_cycle.split("_")[0])
                    : inv.billing_cycle === "QUARTERLY"
                    ? 3
                    : inv.billing_cycle === "HALF_YEARLY"
                    ? 6
                    : inv.billing_cycle === "YEARLY"
                    ? 12
                    : 1;

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Invoice # with ... truncation */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span
                          className="font-mono font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded text-[11px] cursor-help inline-block shadow-2xs"
                          title={inv.invoice_number}
                        >
                          {formatInvoiceId(inv.invoice_number)}
                        </span>
                      </td>

                      {/* Plan & Duration on a single clean line */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span className="font-bold text-slate-900">
                          {inv.plan_name || "Standard School License"}
                        </span>
                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full ml-1.5 whitespace-nowrap">
                          {cycleMonths} Mo · {cycleMonths * 30}d
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-3.5 whitespace-nowrap font-black text-slate-900 text-[13px]">
                        ₹{Number(inv.total_amount).toLocaleString("en-IN")}
                      </td>

                      {/* Payment Method */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        {isRazorpay ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">
                            <Zap className="w-3 h-3 text-blue-600 fill-blue-600" />
                            <span>Razorpay</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap">
                            <Building className="w-3 h-3 text-slate-600" />
                            <span>{inv.payment_method.replace("_", " ")}</span>
                          </span>
                        )}
                      </td>

                      {/* Transaction ID */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span
                          className="font-mono text-[11px] text-slate-600"
                          title={inv.payment_reference || "—"}
                        >
                          {inv.payment_reference
                            ? inv.payment_reference.length > 15
                              ? `${inv.payment_reference.slice(0, 10)}...`
                              : inv.payment_reference
                            : "—"}
                        </span>
                      </td>

                      {/* Purchase Date */}
                      <td className="py-3 px-3.5 whitespace-nowrap text-slate-700">
                        {formatDateTime(inv.paid_at || inv.created_at)}
                      </td>

                      {/* Valid Coverage Period */}
                      <td className="py-3 px-3.5 whitespace-nowrap font-semibold text-slate-800">
                        {formatDate(inv.billing_period_start)} → {formatDate(inv.billing_period_end)}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap ${
                            isPaid
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : "bg-amber-100 text-amber-800 border border-amber-200"
                          }`}
                        >
                          {isPaid ? "Paid & Active" : inv.status}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isPaid && (
                            <>
                              <Link
                                href={`/trustee/subscription/checkout?plan=${sub?.plan || ""}&cycle=${inv.billing_cycle.includes("_") ? "MONTHLY" : inv.billing_cycle}&months=${cycleMonths}`}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-2xs transition-all whitespace-nowrap"
                                title="Pay pending invoice with Razorpay"
                              >
                                <Zap className="w-3 h-3 fill-current" />
                                <span>Pay with Razorpay</span>
                              </Link>
                              <button
                                type="button"
                                onClick={() => handleCancelPending(inv.id)}
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-all shadow-2xs"
                                title="Discard / Cancel pending order"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => setSelectedInvoice(inv)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 font-bold text-xs transition-all shadow-2xs whitespace-nowrap"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>{isPaid ? "Receipt" : "Order"}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invoice / Receipt Modal */}
      {selectedInvoice && (
        <Dialog open={!!selectedInvoice} onOpenChange={(open) => !open && setSelectedInvoice(null)}>
          <DialogContent className="max-w-2xl bg-white p-6 sm:p-8 rounded-2xl">
            <DialogHeader>
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <DialogTitle className="text-lg font-black text-slate-900">
                      Payment Receipt & Tax Invoice
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-500">
                      VidyaSanchalan SaaS Platform · Institutional License
                    </DialogDescription>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Receipt</span>
                </button>
              </div>
            </DialogHeader>

            <div className="space-y-6 pt-2">
              {/* Receipt Header Info */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    School Details
                  </div>
                  <div className="font-black text-slate-900 text-sm mt-0.5">
                    {selectedInvoice.school_name}
                  </div>
                  <div className="text-slate-500 font-mono">Code: #{selectedInvoice.school_code}</div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Invoice Details
                  </div>
                  <div className="font-bold text-slate-900 font-mono text-sm mt-0.5">
                    {selectedInvoice.invoice_number}
                  </div>
                  <div className="text-slate-500">
                    Date: {formatDate(selectedInvoice.paid_at || selectedInvoice.created_at)}
                  </div>
                </div>
              </div>

              {/* Payment Info Banner */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 grid grid-cols-3 gap-3 text-xs">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Payment Mode</div>
                  <div className="font-bold text-slate-900 mt-0.5">
                    {selectedInvoice.payment_method === "ONLINE" ? "Razorpay Gateway" : selectedInvoice.payment_method}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Transaction ID</div>
                  <div className="font-mono text-slate-900 mt-0.5 truncate">
                    {selectedInvoice.payment_reference || "—"}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Status</div>
                  <div className="font-black text-emerald-600 mt-0.5">
                    {selectedInvoice.status}
                  </div>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4">Item & Description</th>
                      <th className="py-2.5 px-4">Duration</th>
                      <th className="py-2.5 px-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">
                          {selectedInvoice.plan_name || "Standard School License"}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Full ERP modules access for school staff, teachers and students
                        </div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-700">
                        {selectedInvoice.billing_cycle.replace("_", " ")}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        ₹{Number(selectedInvoice.subtotal).toLocaleString("en-IN")}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Summary Totals */}
              <div className="space-y-1.5 text-xs text-slate-600 max-w-xs ml-auto">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-bold text-slate-900">
                    ₹{Number(selectedInvoice.subtotal).toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>GST ({Number(selectedInvoice.tax_percentage)}%):</span>
                  <span className="font-bold text-slate-900">
                    +₹{Number(selectedInvoice.tax_amount).toLocaleString("en-IN")}
                  </span>
                </div>
                {Number(selectedInvoice.discount_amount) > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount:</span>
                    <span>-₹{Number(selectedInvoice.discount_amount).toLocaleString("en-IN")}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-black text-slate-900">
                  <span>Total Paid:</span>
                  <span className="text-indigo-600 text-base">
                    ₹{Number(selectedInvoice.total_amount).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {/* Coverage dates */}
              <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
                <span className="flex items-center gap-2 font-bold">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Licensed Validity Coverage:</span>
                </span>
                <span className="font-extrabold font-mono">
                  {formatDate(selectedInvoice.billing_period_start)} → {formatDate(selectedInvoice.billing_period_end)}
                </span>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
