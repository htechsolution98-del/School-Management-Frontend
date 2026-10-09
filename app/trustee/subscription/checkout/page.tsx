"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getPublicPlans,
  checkoutCalculate,
  recordSubscriptionPayment,
  getCurrentSchoolSubscription,
  SubscriptionPlan,
  SchoolSubscription,
} from "@/lib/subscriptions";
import {
  Check,
  ShieldCheck,
  Sparkles,
  CreditCard,
  Building,
  ArrowLeft,
  AlertCircle,
  RefreshCw,
  Zap,
} from "lucide-react";
import Link from "next/link";

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentSub, setCurrentSub] = useState<SchoolSubscription | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);

  const initialCycle = (searchParams.get("cycle") as any) || "MONTHLY";
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "QUARTERLY" | "HALF_YEARLY" | "YEARLY">(initialCycle);
  const [billingCalc, setBillingCalc] = useState<any>(null);

  const [paymentMethod, setPaymentMethod] = useState<"ONLINE" | "BANK_TRANSFER">("ONLINE");
  const [paymentReference, setPaymentReference] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(true);
  const [calcLoading, setCalcLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    async function init() {
      try {
        const [plansData, currentData] = await Promise.all([
          getPublicPlans().catch(() => []),
          getCurrentSchoolSubscription().catch(() => null),
        ]);

        setPlans(plansData);
        if (currentData && currentData.subscription) {
          setCurrentSub(currentData.subscription);
        }

        const planParam = searchParams.get("plan");
        if (planParam && plansData.length > 0) {
          const found = plansData.find((p) => String(p.id) === String(planParam));
          if (found) setSelectedPlan(found);
          else setSelectedPlan(plansData[0]);
        } else if (plansData.length > 0) {
          setSelectedPlan(plansData[0]);
        }
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to load checkout details.");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [searchParams]);

  // Recalculate bill whenever plan or billing cycle changes
  useEffect(() => {
    async function recalculate() {
      if (!selectedPlan) return;
      setCalcLoading(true);
      try {
        const calc = await checkoutCalculate({
          plan_id: selectedPlan.id,
          billing_cycle: billingCycle,
        });
        setBillingCalc(calc);
      } catch (err) {
        console.error("Calculation failed:", err);
      } finally {
        setCalcLoading(false);
      }
    }
    recalculate();
  }, [selectedPlan, billingCycle]);

  async function handleConfirmPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!currentSub) {
      setErrorMsg("No active school subscription found.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      if (paymentMethod === "ONLINE") {
        const res = await recordSubscriptionPayment(currentSub.id, {
          plan_id: selectedPlan?.id,
          billing_cycle: billingCycle,
          payment_method: "ONLINE",
          payment_reference: `RAZORPAY_DEMO_${Date.now()}`,
          notes: notes || "Online Subscription Payment",
        });

        setSuccessMsg(res.message || "Payment processed and subscription activated!");
        setTimeout(() => {
          router.push("/trustee/subscription");
        }, 1500);
      } else {
        if (!paymentReference.trim()) {
          setErrorMsg("Please enter payment reference number or transaction ID.");
          setSubmitting(false);
          return;
        }

        const res = await recordSubscriptionPayment(currentSub.id, {
          plan_id: selectedPlan?.id,
          billing_cycle: billingCycle,
          payment_method: "BANK_TRANSFER",
          payment_reference: paymentReference,
          notes: notes || "Bank Transfer Payment",
        });

        setSuccessMsg(res.message || "Offline payment recorded successfully!");
        setTimeout(() => {
          router.push("/trustee/subscription");
        }, 1500);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to process payment.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-600 font-medium">
          <RefreshCw className="w-5 h-5 animate-spin text-indigo-600" />
          <span>Loading checkout options...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Navigation */}
      <Link
        href="/trustee/subscription"
        className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-900 text-xs font-bold transition-all"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Subscription Overview</span>
      </Link>

      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-indigo-600 fill-indigo-600" />
            <span>School Plan Checkout & Renewal</span>
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Choose your billing duration and complete payment to ensure uninterrupted school ERP operations.
          </p>
        </div>

        {currentSub && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 px-4 shrink-0">
            <div className="text-[10px] uppercase font-bold text-indigo-600">Active School</div>
            <div className="text-xs font-black text-indigo-950">{currentSub.school_name}</div>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl flex items-center gap-3 text-xs font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-3 text-xs font-bold">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Billing Cycle Selector Tabs */}
      <div className="flex items-center justify-center">
        <div className="bg-slate-200/80 p-1.5 rounded-2xl flex items-center gap-1 shadow-inner">
          {(["MONTHLY", "QUARTERLY", "HALF_YEARLY", "YEARLY"] as const).map((cycle) => (
            <button
              key={cycle}
              type="button"
              onClick={() => setBillingCycle(cycle)}
              className={`px-4 sm:px-6 py-2 rounded-xl text-xs font-bold transition-all ${
                billingCycle === cycle
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {cycle === "MONTHLY"
                ? "Monthly"
                : cycle === "QUARTERLY"
                ? "Quarterly (3M)"
                : cycle === "HALF_YEARLY"
                ? "6 Months"
                : "Yearly (12M)"}
            </button>
          ))}
        </div>
      </div>

      {/* Plan Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            cycle: "MONTHLY",
            title: "1-Month Plan",
            badge: "Flexible",
            duration: "30 Days Access",
            price: selectedPlan ? selectedPlan.monthly_price : currentSub?.flat_amount || 5000,
          },
          {
            cycle: "QUARTERLY",
            title: "3-Month Plan",
            badge: "Quarterly",
            duration: "90 Days Access",
            price: selectedPlan ? selectedPlan.quarterly_price : (Number(currentSub?.flat_amount || 5000) * 3),
          },
          {
            cycle: "HALF_YEARLY",
            title: "6-Month Plan",
            badge: "Half-Yearly",
            duration: "180 Days Access",
            price: selectedPlan ? selectedPlan.half_yearly_price : (Number(currentSub?.flat_amount || 5000) * 6),
          },
          {
            cycle: "YEARLY",
            title: "12-Month Plan",
            badge: "Best Value",
            duration: "365 Days Access",
            price: selectedPlan ? selectedPlan.yearly_price : (Number(currentSub?.flat_amount || 5000) * 12),
          },
        ].map((item) => {
          const isSelected = billingCycle === item.cycle;
          return (
            <div
              key={item.cycle}
              onClick={() => setBillingCycle(item.cycle as any)}
              className={`cursor-pointer rounded-2xl p-5 border-2 transition-all relative flex flex-col justify-between ${
                isSelected
                  ? "border-indigo-600 bg-white shadow-md ring-2 ring-indigo-500/20"
                  : "border-slate-200 bg-white hover:border-slate-300 shadow-2xs"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${isSelected ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-600"}`}>
                    {item.badge}
                  </span>
                </div>
                <h3 className="text-sm font-extrabold text-slate-900">{item.title}</h3>
                <p className="text-[11px] text-slate-500 mb-3">{item.duration}</p>

                <div className="text-2xl font-black text-slate-900 mb-3">
                  ₹{Number(item.price).toLocaleString("en-IN")}
                </div>
              </div>

              <button
                type="button"
                className={`w-full py-2 rounded-xl font-bold text-xs transition-all ${
                  isSelected
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {isSelected ? "Selected" : "Select Plan"}
              </button>
            </div>
          );
        })}
      </div>

      {/* Calculation Summary & Payment Form */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-8 max-w-2xl mx-auto space-y-6">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-indigo-600" />
          <span>Checkout & Payment Confirmation</span>
        </h2>

        {/* Bill Breakdown */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-2.5 text-xs text-slate-600">
          <div className="flex justify-between">
            <span>Billing Duration:</span>
            <span className="font-bold text-slate-900">{billingCycle}</span>
          </div>
          <div className="flex justify-between">
            <span>Base Plan Rate:</span>
            <span className="font-semibold text-slate-900">
              ₹{Number(billingCalc?.subtotal || (selectedPlan ? selectedPlan.monthly_price : 5000)).toLocaleString("en-IN")}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span>GST ({Number(billingCalc?.tax_percentage || 0)}%):</span>
            <span className="font-semibold text-slate-900">
              {Number(billingCalc?.tax_percentage || 0) > 0 ? (
                `+₹${Number(billingCalc?.tax_amount || 0).toLocaleString("en-IN")}`
              ) : (
                <span className="text-emerald-600 font-bold text-[11px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  GST Excluded (0%)
                </span>
              )}
            </span>
          </div>
          <div className="pt-2.5 border-t border-slate-200 flex justify-between text-sm font-extrabold text-slate-900">
            <span>Total Amount Payable:</span>
            <span className="text-indigo-600 text-lg">
              ₹{Number(billingCalc?.final_amount || (billingCalc?.subtotal || 5000)).toLocaleString("en-IN")}
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleConfirmPayment} className="space-y-5">
          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
              Select Payment Method
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod("ONLINE")}
                className={`p-3.5 rounded-xl border-2 font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                  paymentMethod === "ONLINE"
                    ? "border-indigo-600 bg-indigo-50/60 text-indigo-700"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span>Online / Razorpay / UPI</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod("BANK_TRANSFER")}
                className={`p-3.5 rounded-xl border-2 font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                  paymentMethod === "BANK_TRANSFER"
                    ? "border-indigo-600 bg-indigo-50/60 text-indigo-700"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Building className="w-4 h-4 text-indigo-600" />
                <span>Bank Transfer / Cheque</span>
              </button>
            </div>
          </div>

          {paymentMethod === "BANK_TRANSFER" && (
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">
                Transaction ID / Reference Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="e.g. UTR123456789 or Cheque #00421"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700">Notes (Optional)</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Payment for term renewal..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || calcLoading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Processing Renewal...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 text-indigo-200" />
                <span>
                  Confirm & Pay ₹{Number(billingCalc?.final_amount || 5000).toLocaleString("en-IN")}
                </span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function TrusteeCheckoutPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Loading checkout...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}
