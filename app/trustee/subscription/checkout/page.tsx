"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Script from "next/script";
import {
  getPublicPlans,
  checkoutCalculate,
  recordSubscriptionPayment,
  createRazorpayOrder,
  verifyRazorpayPayment,
  getCurrentSchoolSubscription,
  formatDateSafe,
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
  Calendar,
  Clock,
  Plus,
  Minus,
  CheckCircle2,
  Lock,
} from "lucide-react";
import Link from "next/link";

// Helper to dynamically load Razorpay script
function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if ((window as any).Razorpay) return resolve(true);

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentSub, setCurrentSub] = useState<SchoolSubscription | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);

  // Billing duration state
  const initialCycle = searchParams.get("cycle") || "MONTHLY";
  const initialMonths = Number(searchParams.get("months") || (initialCycle === "QUARTERLY" ? 3 : initialCycle === "HALF_YEARLY" ? 6 : initialCycle === "YEARLY" ? 12 : 1));

  const [billingCycle, setBillingCycle] = useState<string>(initialCycle);
  const [monthsCount, setMonthsCount] = useState<number>(initialMonths);
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

  // Recalculate bill whenever plan, billing cycle, or monthsCount changes
  useEffect(() => {
    async function recalculate() {
      if (!selectedPlan) return;
      setCalcLoading(true);
      try {
        const calc = await checkoutCalculate({
          plan_id: selectedPlan.id,
          billing_cycle: billingCycle,
          months_count: monthsCount,
        });
        setBillingCalc(calc);
      } catch (err) {
        console.error("Calculation failed:", err);
      } finally {
        setCalcLoading(false);
      }
    }
    recalculate();
  }, [selectedPlan, billingCycle, monthsCount]);

  // Handle plan tier selection
  const handleSelectTier = (cycle: string, months: number) => {
    setBillingCycle(cycle);
    setMonthsCount(months);
  };

  // Payment confirmation & Razorpay handling
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
        // 1. Ensure Razorpay checkout script is loaded
        const isLoaded = await loadRazorpayScript();
        if (!isLoaded) {
          throw new Error("Unable to load Razorpay payment gateway. Please check your internet connection.");
        }

        // 2. Create order in backend via Razorpay API
        const orderRes = await createRazorpayOrder({
          school_id: currentSub.school,
          plan_id: selectedPlan?.id,
          billing_cycle: billingCycle,
          months_count: monthsCount,
        });

        const rawPhone = (currentSub.school_phone || "").replace(/\D/g, "");
        const contactPhone = /^[6-9]\d{9}$/.test(rawPhone) ? rawPhone : "9876543210";
        const contactEmail =
          currentSub.school_email && currentSub.school_email.includes("@")
            ? currentSub.school_email
            : "trustee@school.com";

        // 3. Configure Razorpay modal options
        const options = {
          key: orderRes.key || "rzp_test_SFctsjgfvcrQ6h",
          amount: Math.round(Number(orderRes.amount) * 100),
          currency: orderRes.currency || "INR",
          name: "VidyaSanchalan Platform",
          description: `Subscription Renewal - ${monthsCount} Month(s)`,
          image: "/logo.png",
          order_id: orderRes.order_id,
          handler: async function (response: any) {
            try {
              setSubmitting(true);
              const verifyRes = await verifyRazorpayPayment({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });

              setSuccessMsg(
                verifyRes.message ||
                  `Payment successful! Your subscription is active until ${verifyRes.new_due_date || orderRes.new_due_date}.`
              );

              setTimeout(() => {
                router.push("/trustee/subscription");
              }, 2000);
            } catch (vErr: any) {
              setErrorMsg(vErr.message || "Payment signature verification failed.");
              setSubmitting(false);
            }
          },
          prefill: {
            name: currentSub.school_name,
            email: contactEmail,
            contact: contactPhone,
          },
          notes: {
            school_code: currentSub.school_code,
            invoice_number: orderRes.invoice_number,
            months_count: String(monthsCount),
          },
          theme: {
            color: "#4F46E5",
          },
          modal: {
            backdropclose: true,
            ondismiss: function () {
              setSubmitting(false);
            },
          },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.on("payment.failed", function (response: any) {
          setErrorMsg(
            `Payment Failed: ${response.error?.description || response.error?.reason || "Transaction was declined"}`
          );
          setSubmitting(false);
        });

        rzp.open();
      } else {
        // Bank transfer / manual payment
        if (!paymentReference.trim()) {
          setErrorMsg("Please enter the payment transaction reference number or UTR.");
          setSubmitting(false);
          return;
        }

        const res = await recordSubscriptionPayment(currentSub.id, {
          plan_id: selectedPlan?.id,
          billing_cycle: billingCycle,
          months_count: monthsCount,
          payment_method: "BANK_TRANSFER",
          payment_reference: paymentReference,
          notes: notes || `Offline Bank Transfer renewal for ${monthsCount} month(s)`,
        });

        setSuccessMsg(res.message || "Offline payment recorded successfully!");
        setTimeout(() => {
          router.push("/trustee/subscription");
        }, 1500);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to process payment order.");
      setSubmitting(false);
    }
  }


  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-600 font-medium text-xs">
          <RefreshCw className="w-5 h-5 animate-spin text-indigo-600" />
          <span>Loading checkout options...</span>
        </div>
      </div>
    );
  }

  // Pre-configured duration cards
  const durationPresets = [
    {
      cycle: "MONTHLY",
      months: 1,
      title: "1 Month",
      badge: "Standard",
      badgeColor: "bg-slate-100 text-slate-700",
      description: "30 Days Access",
      multiplier: 1,
    },
    {
      cycle: "MONTHLY",
      months: 2,
      title: "2 Months",
      badge: "Popular",
      badgeColor: "bg-indigo-100 text-indigo-800 font-extrabold",
      description: "60 Days Stacking Access",
      multiplier: 2,
    },
    {
      cycle: "QUARTERLY",
      months: 3,
      title: "3 Months",
      badge: "Quarterly",
      badgeColor: "bg-blue-50 text-blue-700 border border-blue-200",
      description: "90 Days Term Access",
      multiplier: 3,
    },
    {
      cycle: "HALF_YEARLY",
      months: 6,
      title: "6 Months",
      badge: "Semester",
      badgeColor: "bg-purple-50 text-purple-700 border border-purple-200",
      description: "180 Days Term Access",
      multiplier: 6,
    },
    {
      cycle: "YEARLY",
      months: 12,
      title: "12 Months",
      badge: "Best Value",
      badgeColor: "bg-emerald-100 text-emerald-800 font-bold",
      description: "365 Days Annual Access",
      multiplier: 12,
    },
  ];

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
            Choose your billing duration, extend license days seamlessly, and pay securely via Razorpay.
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
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Duration Selector Cards */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Select Billing Duration / Months
          </h2>
          <span className="text-[11px] text-indigo-600 font-semibold">
            Days automatically expand from current expiration
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {durationPresets.map((item) => {
            const isSelected = monthsCount === item.months && (billingCycle === item.cycle || (item.months <= 2 && billingCycle === "MONTHLY"));
            return (
              <div
                key={item.title}
                onClick={() => handleSelectTier(item.cycle, item.months)}
                className={`cursor-pointer rounded-2xl p-4 border-2 transition-all relative flex flex-col justify-between ${
                  isSelected
                    ? "border-indigo-600 bg-white shadow-md ring-2 ring-indigo-500/20"
                    : "border-slate-200 bg-white hover:border-slate-300 shadow-2xs"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                  </div>
                  <h3 className="text-sm font-extrabold text-slate-900">{item.title}</h3>
                  <p className="text-[10px] text-slate-400 mb-2">{item.description}</p>
                </div>

                <div className="mt-2 pt-2 border-t border-slate-100">
                  <div className="text-base font-black text-slate-900">
                    ₹{(Number(selectedPlan?.monthly_price || 5000) * item.multiplier).toLocaleString("en-IN")}
                  </div>
                  <div className="text-[9px] text-slate-400 font-semibold">
                    {item.months} month{item.months > 1 ? "s" : ""} validity
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Custom Months Adjuster */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900">Custom Term Stacking</div>
            <div className="text-[11px] text-slate-500">
              Need more or custom months? Adjust the exact duration to expand:
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (monthsCount > 1) {
                setMonthsCount(monthsCount - 1);
                setBillingCycle("MONTHLY");
              }
            }}
            disabled={monthsCount <= 1}
            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 flex items-center justify-center text-slate-700 transition-all"
          >
            <Minus className="w-4 h-4" />
          </button>
          <div className="text-center min-w-[70px]">
            <span className="text-base font-black text-slate-900">{monthsCount}</span>
            <span className="text-xs font-bold text-slate-500 ml-1">
              Month{monthsCount > 1 ? "s" : ""}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setMonthsCount(monthsCount + 1);
              setBillingCycle("MONTHLY");
            }}
            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition-all"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Days Expansion Telemetry Card */}
      {billingCalc && (
        <div className="bg-gradient-to-r from-indigo-50 via-sky-50 to-emerald-50 rounded-2xl p-5 border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                <span>Days Expansion Calculation</span>
                <span className="bg-indigo-600 text-white text-[9px] px-1.5 py-0.2 rounded font-mono">
                  +{monthsCount} Month{monthsCount > 1 ? "s" : ""}
                </span>
              </div>
              <div className="text-xs font-bold text-slate-800 mt-0.5">
                From: <span className="text-slate-600">{formatDateSafe(billingCalc.current_due_date) || "Today"}</span> → To:{" "}
                <span className="text-emerald-700 font-extrabold">{formatDateSafe(billingCalc.new_due_date) || "Calculated"}</span>
              </div>
            </div>
          </div>

          <div className="text-right sm:border-l sm:border-indigo-200 sm:pl-6 shrink-0">
            <div className="text-[10px] uppercase font-bold text-slate-500">Total Valid Coverage</div>
            <div className="text-lg font-black text-emerald-700">
              {billingCalc.expanded_days || monthsCount * 30} Days
            </div>
          </div>
        </div>
      )}

      {/* Checkout Calculation & Razorpay Form */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-8 max-w-2xl mx-auto space-y-6">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-indigo-600" />
          <span>Checkout & Payment Confirmation</span>
        </h2>

        {/* Bill Breakdown */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-2.5 text-xs text-slate-600">
          <div className="flex justify-between">
            <span>Selected Plan:</span>
            <span className="font-bold text-slate-900">{selectedPlan?.name || "Standard School License"}</span>
          </div>
          <div className="flex justify-between">
            <span>Duration:</span>
            <span className="font-bold text-indigo-700">
              {monthsCount} Month{monthsCount > 1 ? "s" : ""} ({monthsCount * 30} Days)
            </span>
          </div>
          <div className="flex justify-between">
            <span>Base Rate:</span>
            <span className="font-semibold text-slate-900">
              ₹{Number(billingCalc?.subtotal || (selectedPlan ? Number(selectedPlan.monthly_price) * monthsCount : 5000 * monthsCount)).toLocaleString("en-IN")}
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
            <span>Total Payable Amount:</span>
            <span className="text-indigo-600 text-xl font-black">
              ₹{Number(billingCalc?.final_amount || 5000 * monthsCount).toLocaleString("en-IN")}
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleConfirmPayment} className="space-y-5">
          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
              Select Payment Gateway / Method
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod("ONLINE")}
                className={`p-4 rounded-xl border-2 font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                  paymentMethod === "ONLINE"
                    ? "border-indigo-600 bg-indigo-50/70 text-indigo-700 shadow-xs"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span>Razorpay (UPI, Card, NetBanking)</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod("BANK_TRANSFER")}
                className={`p-4 rounded-xl border-2 font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                  paymentMethod === "BANK_TRANSFER"
                    ? "border-indigo-600 bg-indigo-50/70 text-indigo-700 shadow-xs"
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
              placeholder="e.g. Subscription extension for 2 terms..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
            />
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200/60">
            <Lock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span>
              256-bit encrypted checkout via Razorpay Gateway. Instant activation upon successful transaction.
            </span>
          </div>

          <button
            type="submit"
            disabled={submitting || calcLoading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            {submitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Opening Razorpay Secure Gateway...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 text-indigo-200" />
                <span>
                  Pay ₹{Number(billingCalc?.final_amount || 5000 * monthsCount).toLocaleString("en-IN")} via {paymentMethod === "ONLINE" ? "Razorpay Gateway" : "Bank Transfer"}
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
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
      <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Loading checkout...</div>}>
        <CheckoutContent />
      </Suspense>
    </>
  );
}
