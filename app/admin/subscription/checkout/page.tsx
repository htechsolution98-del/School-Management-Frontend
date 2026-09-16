"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

export default function SubscriptionCheckoutPage() {
  const router = useRouter();

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentSub, setCurrentSub] = useState<SchoolSubscription | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "QUARTERLY" | "HALF_YEARLY" | "YEARLY">("MONTHLY");
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
          getPublicPlans(),
          getCurrentSchoolSubscription().catch(() => null),
        ]);

        setPlans(plansData);
        if (currentData && currentData.subscription) {
          setCurrentSub(currentData.subscription);
        }

        if (plansData.length > 0) {
          setSelectedPlan(plansData[0]);
        }
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to load checkout details.");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

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
        // Trigger Online Razorpay Order Creation via backend
        const res = await recordSubscriptionPayment(currentSub.id, {
          plan_id: selectedPlan?.id,
          billing_cycle: billingCycle,
          payment_method: "ONLINE",
          payment_reference: `RAZORPAY_DEMO_${Date.now()}`,
          notes: notes || "Online Subscription Payment",
        });

        setSuccessMsg(res.message || "Payment processed and subscription activated!");
        setTimeout(() => {
          router.push("/admin/subscription");
        }, 1500);
      } else {
        // Bank Transfer / Offline Payment
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
          router.push("/admin/subscription");
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-600 font-medium">
          <RefreshCw className="w-5 h-5 animate-spin text-indigo-600" />
          <span>Loading checkout options...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 pb-20 pt-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Navigation */}
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-900 text-sm font-semibold mb-6 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Subscription</span>
        </button>

        {/* Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-indigo-600 fill-indigo-600" />
            <span>Subscribe & Select Plan</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Choose your subscription plan and billing cycle to get instant access to SMS features.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-3 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-3 text-sm font-semibold">
            <Check className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Billing Cycle Selector Tabs */}
        <div className="flex items-center justify-center mb-10">
          <div className="bg-slate-200/80 p-1.5 rounded-2xl flex items-center gap-1 shadow-inner">
            {(["MONTHLY", "QUARTERLY", "HALF_YEARLY", "YEARLY"] as const).map((cycle) => (
              <button
                key={cycle}
                type="button"
                onClick={() => setBillingCycle(cycle)}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  billingCycle === cycle
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {cycle === "MONTHLY"
                  ? "Monthly"
                  : cycle === "QUARTERLY"
                  ? "Quarterly (3 Mos)"
                  : cycle === "HALF_YEARLY"
                  ? "6 Months"
                  : "Yearly (Best Value)"}
              </button>
            ))}
          </div>
        </div>

        {/* Plan Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {plans.map((plan) => {
            const isSelected = selectedPlan?.id === plan.id;
            let price = plan.monthly_price;
            if (billingCycle === "QUARTERLY") price = plan.quarterly_price;
            if (billingCycle === "HALF_YEARLY") price = plan.half_yearly_price;
            if (billingCycle === "YEARLY") price = plan.yearly_price;

            return (
              <div
                key={plan.id}
                onClick={() => setSelectedPlan(plan)}
                className={`cursor-pointer rounded-2xl p-6 border-2 transition-all relative flex flex-col justify-between ${
                  isSelected
                    ? "border-indigo-600 bg-white shadow-xl scale-[1.02]"
                    : "border-slate-200 bg-white/80 hover:border-slate-300 shadow-sm"
                }`}
              >
                {isSelected && (
                  <span className="absolute -top-3 right-6 bg-indigo-600 text-white text-[10px] font-extrabold uppercase px-3 py-1 rounded-full shadow-sm">
                    Selected Plan
                  </span>
                )}

                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-1">{plan.name}</h3>
                  <p className="text-xs text-slate-500 mb-6">{plan.description || "Full access plan"}</p>

                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-3xl font-extrabold text-slate-900">
                      ₹{Number(price).toLocaleString("en-IN")}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      /{plan.pricing_model === "PER_STUDENT" ? "student/" : ""}
                      {billingCycle.toLowerCase()}
                    </span>
                  </div>

                  {/* Limits */}
                  <div className="space-y-2.5 mb-6 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>Max Students: {plan.max_students === 0 ? "Unlimited" : plan.max_students}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>Max Teachers: {plan.max_teachers === 0 ? "Unlimited" : plan.max_teachers}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>Storage: {plan.storage_limit_mb} MB</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all ${
                    isSelected
                      ? "bg-indigo-600 text-white shadow-md hover:bg-indigo-700"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {isSelected ? "Selected" : "Select Plan"}
                </button>
              </div>
            );
          })}
        </div>

        {/* Calculation Summary & Payment Options */}
        {selectedPlan && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-8 max-w-3xl mx-auto">
            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-indigo-600" />
              <span>Checkout Order Summary</span>
            </h2>

            {/* Bill Breakdown */}
            <div className="bg-slate-50 rounded-xl p-5 mb-8 border border-slate-200/80 space-y-3 text-sm text-slate-600">
              <div className="flex justify-between">
                <span>Selected Plan:</span>
                <span className="font-bold text-slate-900">{selectedPlan.name} ({billingCycle})</span>
              </div>
              <div className="flex justify-between">
                <span>Active Student Count:</span>
                <span className="font-semibold text-slate-900">{billingCalc?.student_count || 0} Students</span>
              </div>
              <div className="flex justify-between">
                <span>Unit Rate:</span>
                <span className="font-semibold text-slate-900">₹{billingCalc?.unit_rate || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-semibold text-slate-900">₹{billingCalc?.subtotal || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>GST ({billingCalc?.tax_percentage || 18}%):</span>
                <span className="font-semibold text-slate-900">₹{billingCalc?.tax_amount || 0}</span>
              </div>
              <div className="pt-3 border-t border-slate-200 flex justify-between text-base font-extrabold text-slate-900">
                <span>Total Amount Payable:</span>
                <span className="text-indigo-600 text-xl">
                  ₹{Number(billingCalc?.final_amount || 0).toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleConfirmPayment}>
              {/* Payment Method Selector */}
              <div className="mb-6">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  Select Payment Method
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("ONLINE")}
                    className={`p-4 rounded-xl border-2 font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                      paymentMethod === "ONLINE"
                        ? "border-indigo-600 bg-indigo-50/50 text-indigo-700"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span>Online / Razorpay / UPI</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("BANK_TRANSFER")}
                    className={`p-4 rounded-xl border-2 font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                      paymentMethod === "BANK_TRANSFER"
                        ? "border-indigo-600 bg-indigo-50/50 text-indigo-700"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Building className="w-4 h-4 text-indigo-600" />
                    <span>Bank Transfer / Cheque</span>
                  </button>
                </div>
              </div>

              {paymentMethod === "BANK_TRANSFER" && (
                <div className="mb-6">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Transaction ID / Reference Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="e.g. UTR123456789 or Cheque #00421"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              )}

              <div className="mb-8">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Notes (Optional)</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes for billing department..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || calcLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl text-sm shadow-lg transition-all flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processing Subscription...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-5 h-5 text-indigo-300" />
                    <span>
                      Complete & Pay ₹{Number(billingCalc?.final_amount || 0).toLocaleString("en-IN")}
                    </span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
