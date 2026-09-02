"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useConfirm } from "@/components/providers/confirm-provider";
import {
  Building2,
  Users,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Lock,
  Unlock,
  CreditCard,
  Receipt,
  FileText,
  DollarSign,
  TrendingUp,
  Calendar,
  Sparkles,
  ChevronRight,
  Printer,
  X,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  Check,
  Coins,
  BadgePercent,
  Sliders,
  Send,
} from "lucide-react";

import {
  getSubscriptions,
  getSubscriptionSummary,
  updateSubscription,
  recordSubscriptionPayment,
  generateSchoolInvoice,
  toggleSchoolLock,
  getSchoolInvoices,
  markInvoicePaid,
  SchoolSubscription,
  SchoolInvoice,
  SubscriptionSummary,
} from "@/lib/subscriptions";

export default function SuperAdminSubscriptionsPage() {
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState<"subscriptions" | "invoices">("subscriptions");
  const [subscriptions, setSubscriptions] = useState<SchoolSubscription[]>([]);
  const [invoices, setInvoices] = useState<SchoolInvoice[]>([]);
  const [summary, setSummary] = useState<SubscriptionSummary>({
    total_schools: 0,
    active_paid: 0,
    active_trials: 0,
    expired_overdue: 0,
    projected_monthly_revenue: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  /* Modal States */
  const [editingSub, setEditingSub] = useState<SchoolSubscription | null>(null);
  const [payingSub, setPayingSub] = useState<SchoolSubscription | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<SchoolInvoice | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  /* Edit Plan Form State */
  const [planType, setPlanType] = useState<"TRIAL" | "PAID">("PAID");
  const [billingModel, setBillingModel] = useState<"FLAT" | "PER_STUDENT">("FLAT");
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "QUARTERLY" | "YEARLY" | "CUSTOM">("MONTHLY");
  const [flatAmount, setFlatAmount] = useState<string>("5000");
  const [perStudentRate, setPerStudentRate] = useState<string>("15");
  const [dueDate, setDueDate] = useState<string>("");
  const [graceDays, setGraceDays] = useState<number>(0);
  const [autoLock, setAutoLock] = useState<boolean>(true);
  const [planNotes, setPlanNotes] = useState<string>("");

  /* Record Payment Form State */
  const [payAmount, setPayAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("BANK_TRANSFER");
  const [paymentRef, setPaymentRef] = useState<string>("");
  const [renewCycle, setRenewCycle] = useState<string>("MONTHLY");
  const [customNextDue, setCustomNextDue] = useState<string>("");
  const [payNotes, setPayNotes] = useState<string>("");

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg("");
    try {
      const [subsData, summaryData, invoicesData] = await Promise.all([
        getSubscriptions(),
        getSubscriptionSummary(),
        getSchoolInvoices(),
      ]);
      setSubscriptions(subsData);
      setSummary(summaryData);
      setInvoices(invoicesData);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load subscription data.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const showToast = (msg: string, isError = false) => {
    if (isError) {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(""), 4000);
    } else {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(""), 4000);
    }
  };

  /* Open Edit Plan Modal */
  const handleOpenEditPlan = (sub: SchoolSubscription) => {
    setEditingSub(sub);
    setPlanType(sub.plan_type);
    setBillingModel(sub.billing_model);
    setBillingCycle(sub.billing_cycle);
    setFlatAmount(String(sub.flat_amount || "5000"));
    setPerStudentRate(String(sub.per_student_rate || "15"));
    setDueDate(sub.due_date);
    setGraceDays(sub.grace_period_days || 0);
    setAutoLock(sub.auto_lock_on_due ?? true);
    setPlanNotes(sub.notes || "");
  };

  /* Save Plan */
  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSub) return;
    setIsActionLoading(true);
    try {
      await updateSubscription(editingSub.id, {
        plan_type: planType,
        billing_model: billingModel,
        billing_cycle: billingCycle,
        flat_amount: parseFloat(flatAmount) || 0,
        per_student_rate: parseFloat(perStudentRate) || 0,
        due_date: dueDate,
        grace_period_days: Number(graceDays) || 0,
        auto_lock_on_due: autoLock,
        status: planType === "TRIAL" ? "TRIAL" : "ACTIVE",
        notes: planNotes,
      });
      showToast("Subscription plan updated successfully.");
      setEditingSub(null);
      fetchData();
    } catch (err: any) {
      showToast(err.message || "Failed to update plan", true);
    } finally {
      setIsActionLoading(false);
    }
  };

  /* Open Payment Modal */
  const handleOpenRecordPayment = (sub: SchoolSubscription) => {
    setPayingSub(sub);
    setPayAmount(String(sub.calculated_amount || ""));
    setPaymentMethod("BANK_TRANSFER");
    setPaymentRef("");
    setRenewCycle(sub.billing_cycle || "MONTHLY");
    setCustomNextDue("");
    setPayNotes("");
  };

  /* Submit Payment */
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingSub) return;
    setIsActionLoading(true);
    try {
      const res = await recordSubscriptionPayment(payingSub.id, {
        amount: parseFloat(payAmount) || undefined,
        payment_method: paymentMethod,
        payment_reference: paymentRef,
        billing_cycle: renewCycle,
        next_due_date: customNextDue || undefined,
        notes: payNotes,
      });
      showToast(res.message || "Payment recorded and subscription renewed successfully!");
      setPayingSub(null);
      fetchData();
      if (res.invoice) {
        setViewingInvoice(res.invoice);
      }
    } catch (err: any) {
      showToast(err.message || "Failed to record payment", true);
    } finally {
      setIsActionLoading(false);
    }
  };

  /* Generate Invoice */
  const handleGenerateInvoice = async (sub: SchoolSubscription) => {
    if (!(await confirm(`Generate current invoice for ${sub.school_name}? Current student count: ${sub.live_student_count}`))) return;
    setIsActionLoading(true);
    try {
      const res = await generateSchoolInvoice(sub.id);
      showToast("Invoice generated successfully.");
      fetchData();
      if (res.invoice) {
        setViewingInvoice(res.invoice);
      }
    } catch (err: any) {
      showToast(err.message || "Failed to generate invoice", true);
    } finally {
      setIsActionLoading(false);
    }
  };

  /* Toggle School Lock */
  const handleToggleLock = async (sub: SchoolSubscription) => {
    const isCurrentlyActive = sub.school_is_active;
    const actionName = isCurrentlyActive ? "LOCK / SUSPEND" : "UNLOCK / ACTIVATE";
    if (!(await confirm(`Are you sure you want to ${actionName} ${sub.school_name}?`))) return;
    try {
      const res = await toggleSchoolLock(sub.id);
      showToast(res.message || "School status updated.");
      fetchData();
    } catch (err: any) {
      showToast(err.message || "Failed to update school lock status", true);
    }
  };

  /* Filter Subscriptions */
  const filteredSubs = subscriptions.filter((s) => {
    const q = searchQuery.toLowerCase();
    const matchesQuery =
      (s.school_name || "").toLowerCase().includes(q) ||
      (s.school_code || "").toLowerCase().includes(q) ||
      (s.school_city || "").toLowerCase().includes(q);

    if (!matchesQuery) return false;

    if (statusFilter === "ACTIVE") return s.status === "ACTIVE";
    if (statusFilter === "TRIAL") return s.status === "TRIAL";
    if (statusFilter === "EXPIRED") return s.status === "EXPIRED" || s.days_left < 0;
    if (statusFilter === "SUSPENDED") return s.status === "SUSPENDED" || !s.school_is_active;

    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-2 sm:p-4 text-slate-900">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 md:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 pointer-events-none transform translate-x-10 -translate-y-10">
          <BadgePercent size={260} />
        </div>
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            SaaS Tenant Licensing & Billing Engine
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            School Subscriptions & Licensing
          </h1>
          <p className="text-sm text-slate-300 mt-1 max-w-2xl">
            Configure free trials, flat rates, or dynamic per-student billing models. Automated access suspension on expiration with instant payment renewal.
          </p>
        </div>
        <div className="flex items-center gap-3 relative z-10 w-full md:w-auto">
          <Button
            variant="outline"
            size="icon"
            onClick={fetchData}
            disabled={isLoading}
            className="rounded-2xl bg-white/10 hover:bg-white/20 border-white/20 text-white"
            title="Refresh subscriptions"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Toast Messages */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold shadow-sm"
          >
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            {successMsg}
          </motion.div>
        )}
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-3 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-semibold shadow-sm"
          >
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
            {errorMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Schools */}
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Enrolled Campuses</p>
              <h3 className="text-3xl font-black text-slate-900 mt-2">{summary.total_schools}</h3>
              <p className="text-xs text-indigo-600 font-semibold mt-1">Multi-Tenant Portals</p>
            </div>
            <div className="p-4 rounded-2xl bg-indigo-50 text-indigo-600">
              <Building2 className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Active Paid Subscriptions */}
        <div className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/40 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Active Paid Plans</p>
              <h3 className="text-3xl font-black text-slate-900 mt-2">{summary.active_paid}</h3>
              <p className="text-xs text-emerald-700 font-semibold mt-1 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Licensed & Verified
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-100 text-emerald-700">
              <ShieldCheck className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Active Free Trials */}
        <div className="rounded-3xl border border-amber-100 bg-gradient-to-br from-white to-amber-50/40 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">Free Trials Active</p>
              <h3 className="text-3xl font-black text-slate-900 mt-2">{summary.active_trials}</h3>
              <p className="text-xs text-amber-700 font-semibold mt-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Due Date Monitored
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-amber-100 text-amber-700">
              <Sparkles className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Projected Monthly Revenue */}
        <div className="rounded-3xl border border-blue-100 bg-gradient-to-br from-white to-blue-50/40 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">Projected MRR</p>
              <h3 className="text-3xl font-black text-slate-900 mt-2">₹{summary.projected_monthly_revenue.toLocaleString("en-IN")}</h3>
              <p className="text-xs text-blue-700 font-semibold mt-1 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" /> Flat + Student-based
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-blue-100 text-blue-700">
              <Coins className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation & Search Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl w-full sm:w-auto">
          <button
            onClick={() => setActiveTab("subscriptions")}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "subscriptions"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <BadgePercent className="w-4 h-4" />
            School Subscriptions ({subscriptions.length})
          </button>
          <button
            onClick={() => setActiveTab("invoices")}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "invoices"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Receipt className="w-4 h-4" />
            Invoices & Billing Ledger ({invoices.length})
          </button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              placeholder="Search by school, code, city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 text-xs rounded-2xl border-slate-200 text-slate-900 bg-slate-50/50"
            />
          </div>
        </div>
      </div>

      {/* TAB 1: SCHOOL SUBSCRIPTIONS DIRECTORY */}
      {activeTab === "subscriptions" && (
        <div className="space-y-4">
          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: "ALL", label: "All Campuses" },
              { id: "ACTIVE", label: "Paid Active" },
              { id: "TRIAL", label: "Free Trial" },
              { id: "EXPIRED", label: "Expired / Overdue" },
              { id: "SUSPENDED", label: "Locked / Suspended" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  statusFilter === f.id
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            {isLoading ? (
              <div className="p-12 flex flex-col items-center justify-center text-slate-400 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                <p className="text-sm font-semibold text-slate-600">Loading school subscriptions...</p>
              </div>
            ) : filteredSubs.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30 text-indigo-400" />
                <p className="text-base font-semibold text-slate-700">No schools matching filter</p>
                <p className="text-xs text-slate-400 mt-1">Try another search query or clear filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500 tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="py-4 px-5">School & Code</th>
                      <th className="py-4 px-5">Plan Type</th>
                      <th className="py-4 px-5">Billing Model & Fee Calculation</th>
                      <th className="py-4 px-5 text-center">Next Due Date</th>
                      <th className="py-4 px-5 text-center">Days Remaining</th>
                      <th className="py-4 px-5 text-center">Licensing Status</th>
                      <th className="py-4 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredSubs.map((sub) => {
                      const isExpired = sub.days_left < 0 || sub.status === "EXPIRED";
                      const isLocked = !sub.school_is_active || sub.status === "SUSPENDED";

                      return (
                        <tr key={sub.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-4 px-5">
                            <div className="font-bold text-slate-900 text-sm">{sub.school_name}</div>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                              <span className="font-mono text-indigo-600 font-bold">{sub.school_code}</span>
                              {sub.school_city && <span>• {sub.school_city}</span>}
                            </div>
                          </td>

                          <td className="py-4 px-5">
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold ${
                                sub.plan_type === "TRIAL"
                                  ? "bg-amber-50 text-amber-800 border border-amber-200"
                                  : "bg-indigo-50 text-indigo-800 border border-indigo-200"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  sub.plan_type === "TRIAL" ? "bg-amber-500" : "bg-indigo-600"
                                }`}
                              />
                              {sub.plan_type === "TRIAL" ? "Free Trial" : "Paid Subscription"}
                            </span>
                            <div className="text-[10px] text-slate-400 mt-1 uppercase font-semibold">
                              Cycle: {sub.billing_cycle}
                            </div>
                          </td>

                          <td className="py-4 px-5">
                            {sub.billing_model === "PER_STUDENT" ? (
                              <div>
                                <div className="font-bold text-slate-900 text-xs">
                                  ₹{sub.per_student_rate} / Student
                                </div>
                                <div className="text-[11px] text-indigo-600 font-bold mt-0.5">
                                  {sub.live_student_count} Enrolled × ₹{sub.per_student_rate} = ₹
                                  {sub.calculated_amount.toLocaleString("en-IN")}
                                </div>
                              </div>
                            ) : (
                              <div>
                                <div className="font-bold text-slate-900 text-xs">
                                  Flat ₹{Number(sub.flat_amount).toLocaleString("en-IN")} / {sub.billing_cycle.toLowerCase()}
                                </div>
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  Fixed Institutional Fee
                                </div>
                              </div>
                            )}
                          </td>

                          <td className="py-4 px-5 text-center font-mono font-bold text-slate-800">
                            {sub.due_date}
                          </td>

                          <td className="py-4 px-5 text-center">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[11px] font-bold inline-block ${
                                isExpired
                                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                                  : sub.days_left <= 7
                                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                                  : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              }`}
                            >
                              {isExpired ? `${Math.abs(sub.days_left)} days overdue` : `${sub.days_left} days left`}
                            </span>
                          </td>

                          <td className="py-4 px-5 text-center">
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold ${
                                isLocked
                                  ? "bg-rose-100 text-rose-800 border border-rose-300"
                                  : isExpired
                                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                                  : sub.status === "TRIAL"
                                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                                  : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              }`}
                            >
                              {isLocked ? (
                                <>
                                  <Lock className="w-3 h-3 text-rose-600" />
                                  Locked / Suspended
                                </>
                              ) : isExpired ? (
                                <>
                                  <AlertCircle className="w-3 h-3 text-rose-600" />
                                  Expired
                                </>
                              ) : (
                                <>
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  Active
                                </>
                              )}
                            </span>
                          </td>

                          <td className="py-4 px-5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Record Payment Button */}
                              <Button
                                size="sm"
                                onClick={() => handleOpenRecordPayment(sub)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs h-8 px-3 font-semibold gap-1"
                                title="Record Payment & Advance Due Date"
                              >
                                <Coins className="w-3.5 h-3.5" />
                                Record Pay
                              </Button>

                              {/* Configure Plan */}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenEditPlan(sub)}
                                className="border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs h-8 px-2.5"
                                title="Configure Subscription / Trial"
                              >
                                <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                              </Button>

                              {/* Generate Invoice */}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleGenerateInvoice(sub)}
                                className="border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs h-8 px-2.5"
                                title="Generate Invoice"
                              >
                                <Receipt className="w-3.5 h-3.5 text-indigo-600" />
                              </Button>

                              {/* Lock / Unlock */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleLock(sub)}
                                className={`rounded-xl text-xs h-8 px-2 ${
                                  sub.school_is_active
                                    ? "text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                    : "text-emerald-600 hover:bg-emerald-50"
                                }`}
                                title={sub.school_is_active ? "Lock School" : "Unlock School"}
                              >
                                {sub.school_is_active ? (
                                  <Lock className="w-3.5 h-3.5" />
                                ) : (
                                  <Unlock className="w-3.5 h-3.5" />
                                )}
                              </Button>
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
        </div>
      )}

      {/* TAB 2: INVOICES & BILLING LEDGER */}
      {activeTab === "invoices" && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="font-bold text-base text-slate-900">Institutional Invoices & Payment Ledger</h3>
              <p className="text-xs text-slate-500">History of all generated invoices, live student snapshots, and payment receipts.</p>
            </div>
          </div>

          {invoices.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Receipt className="w-12 h-12 mx-auto mb-3 opacity-30 text-indigo-400" />
              <p className="text-base font-semibold text-slate-700">No invoices generated yet</p>
              <p className="text-xs text-slate-400 mt-1">Generate invoices from the School Subscriptions tab.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500 tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="py-4 px-5">Invoice #</th>
                    <th className="py-4 px-5">School Name</th>
                    <th className="py-4 px-5">Billing Period</th>
                    <th className="py-4 px-5 text-center">Student Snapshot</th>
                    <th className="py-4 px-5">Amount</th>
                    <th className="py-4 px-5 text-center">Status</th>
                    <th className="py-4 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-5 font-mono font-bold text-indigo-600">{inv.invoice_number}</td>
                      <td className="py-4 px-5 font-bold text-slate-900">{inv.school_name}</td>
                      <td className="py-4 px-5 text-slate-600 text-[11px]">
                        {inv.billing_period_start} → {inv.billing_period_end}
                      </td>
                      <td className="py-4 px-5 text-center font-bold text-slate-800">
                        {inv.billing_model === "PER_STUDENT" ? `${inv.student_count} Students` : "Flat Rate"}
                      </td>
                      <td className="py-4 px-5 font-black text-slate-900 text-sm">
                        ₹{Number(inv.total_amount).toLocaleString("en-IN")}
                      </td>
                      <td className="py-4 px-5 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold ${
                            inv.status === "PAID"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              inv.status === "PAID" ? "bg-emerald-500" : "bg-amber-500"
                            }`}
                          />
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setViewingInvoice(inv)}
                          className="text-xs rounded-xl border-slate-200 gap-1.5 text-indigo-600 font-semibold"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          View Receipt
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 🌟 EDIT PLAN & SUBSCRIPTION MODAL */}
      <AnimatePresence>
        {editingSub && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="bg-white rounded-3xl shadow-2xl p-6 md:p-8 w-full max-w-2xl overflow-hidden flex flex-col relative max-h-[90vh] border border-slate-100"
            >
              <button
                type="button"
                onClick={() => setEditingSub(null)}
                className="absolute top-6 right-6 p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors z-10"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="mb-6">
                <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Configure Plan: {editingSub.school_name}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Assign trial, set flat fee or dynamic per-student billing, and define due date.
                </p>
              </div>

              <div className="overflow-y-auto custom-scrollbar pr-2 flex-1">
                <form onSubmit={handleSavePlan} className="space-y-4 pb-4">
                  {/* Plan Type Selector */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Plan Type</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setPlanType("TRIAL")}
                        className={`p-3 rounded-2xl border text-left font-bold text-xs transition-all ${
                          planType === "TRIAL"
                            ? "bg-amber-50 border-amber-300 text-amber-900 shadow-sm"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        🌟 Free Trial
                        <p className="text-[11px] font-normal text-slate-500 mt-0.5">Time-limited trial access</p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPlanType("PAID")}
                        className={`p-3 rounded-2xl border text-left font-bold text-xs transition-all ${
                          planType === "PAID"
                            ? "bg-indigo-50 border-indigo-300 text-indigo-900 shadow-sm"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        💳 Paid Subscription
                        <p className="text-[11px] font-normal text-slate-500 mt-0.5">Recurring billing plan</p>
                      </button>
                    </div>
                  </div>

                  {/* Billing Model Selector */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Billing Model</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setBillingModel("FLAT")}
                        className={`p-3 rounded-2xl border text-left font-bold text-xs transition-all ${
                          billingModel === "FLAT"
                            ? "bg-indigo-50 border-indigo-300 text-indigo-900 shadow-sm"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        🏛️ Flat Fixed Rate
                        <p className="text-[11px] font-normal text-slate-500 mt-0.5">Fixed periodic institutional fee</p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setBillingModel("PER_STUDENT")}
                        className={`p-3 rounded-2xl border text-left font-bold text-xs transition-all ${
                          billingModel === "PER_STUDENT"
                            ? "bg-indigo-50 border-indigo-300 text-indigo-900 shadow-sm"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        👥 Per-Student Dynamic Billing
                        <p className="text-[11px] font-normal text-slate-500 mt-0.5">Auto-calculated by live student count</p>
                      </button>
                    </div>
                  </div>

                  {/* Pricing Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {billingModel === "FLAT" ? (
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">Flat Amount (₹)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          required
                          value={flatAmount}
                          onChange={(e) => setFlatAmount(e.target.value)}
                          placeholder="5000"
                          className="h-10 text-xs rounded-xl"
                        />
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">Rate Per Student (₹)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          required
                          value={perStudentRate}
                          onChange={(e) => setPerStudentRate(e.target.value)}
                          placeholder="15"
                          className="h-10 text-xs rounded-xl"
                        />
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">Billing Cycle</Label>
                      <select
                        value={billingCycle}
                        onChange={(e) => setBillingCycle(e.target.value as any)}
                        className="w-full h-10 px-3 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600"
                      >
                        <option value="MONTHLY">Monthly</option>
                        <option value="QUARTERLY">Quarterly (3 Months)</option>
                        <option value="YEARLY">Yearly (12 Months)</option>
                        <option value="CUSTOM">Custom</option>
                      </select>
                    </div>
                  </div>

                  {/* 📊 Live Dynamic Calculation Box */}
                  <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 space-y-1">
                    <p className="text-[11px] font-bold uppercase text-indigo-700 tracking-wider">Estimated Bill Calculation</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-600">
                        {billingModel === "PER_STUDENT"
                          ? `Live Students (${editingSub.live_student_count}) × ₹${perStudentRate || 0}`
                          : "Fixed Flat Institutional Rate"}
                      </span>
                      <span className="text-base font-black text-indigo-900">
                        ₹
                        {billingModel === "PER_STUDENT"
                          ? (editingSub.live_student_count * (parseFloat(perStudentRate) || 0)).toLocaleString("en-IN")
                          : (parseFloat(flatAmount) || 0).toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>

                  {/* Dates & Auto Lock */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">Due Date / Expiration Date *</Label>
                      <Input
                        type="date"
                        required
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="h-10 text-xs rounded-xl"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">Grace Period (Days)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={graceDays}
                        onChange={(e) => setGraceDays(parseInt(e.target.value) || 0)}
                        placeholder="0"
                        className="h-10 text-xs rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200/70">
                    <input
                      type="checkbox"
                      id="autolock"
                      checked={autoLock}
                      onChange={(e) => setAutoLock(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor="autolock" className="text-xs font-semibold text-slate-700 cursor-pointer">
                      Auto-suspend / lock school access when due date expires without payment
                    </label>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setEditingSub(null)}
                      className="rounded-xl text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isActionLoading}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs px-6 font-semibold"
                    >
                      {isActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Plan"}
                    </Button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 🌟 RECORD PAYMENT & ADVANCE DUE DATE MODAL */}
      <AnimatePresence>
        {payingSub && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="bg-white rounded-3xl shadow-2xl p-6 md:p-8 w-full max-w-xl overflow-hidden flex flex-col relative max-h-[90vh] border border-slate-100"
            >
              <button
                type="button"
                onClick={() => setPayingSub(null)}
                className="absolute top-6 right-6 p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors z-10"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="mb-6">
                <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Record Payment & Renew Subscription
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  School: <span className="font-bold text-slate-800">{payingSub.school_name}</span> ({payingSub.school_code})
                </p>
              </div>

              <div className="overflow-y-auto custom-scrollbar pr-2 flex-1">
                <form onSubmit={handleSubmitPayment} className="space-y-4 pb-4">
                  <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100">
                    <p className="text-[11px] font-bold uppercase text-emerald-700 tracking-wider">Calculated Subscription Amount</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-slate-600">
                        {payingSub.billing_model === "PER_STUDENT"
                          ? `${payingSub.live_student_count} Students × ₹${payingSub.per_student_rate}`
                          : `Flat Rate (${payingSub.billing_cycle})`}
                      </span>
                      <span className="text-xl font-black text-emerald-900">
                        ₹{payingSub.calculated_amount.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">Amount Received (₹) *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        required
                        value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value)}
                        className="h-10 text-xs rounded-xl"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">Payment Mode</Label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-full h-10 px-3 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-600"
                      >
                        <option value="BANK_TRANSFER">Bank Transfer / NEFT / RTGS</option>
                        <option value="ONLINE">Online / UPI / Razorpay</option>
                        <option value="CHEQUE">Cheque</option>
                        <option value="CASH">Cash</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Transaction Ref / UTR / Cheque No.</Label>
                    <Input
                      type="text"
                      placeholder="e.g. UTR-987654321 or Chq #4091"
                      value={paymentRef}
                      onChange={(e) => setPaymentRef(e.target.value)}
                      className="h-10 text-xs rounded-xl"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">Renew For Cycle</Label>
                      <select
                        value={renewCycle}
                        onChange={(e) => setRenewCycle(e.target.value)}
                        className="w-full h-10 px-3 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-600"
                      >
                        <option value="MONTHLY">+ 1 Month Renewal</option>
                        <option value="QUARTERLY">+ 1 Quarter (3 Months) Renewal</option>
                        <option value="YEARLY">+ 1 Year (12 Months) Renewal</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">Custom Next Due Date (Optional)</Label>
                      <Input
                        type="date"
                        value={customNextDue}
                        onChange={(e) => setCustomNextDue(e.target.value)}
                        className="h-10 text-xs rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setPayingSub(null)}
                      className="rounded-xl text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isActionLoading}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs px-6 font-semibold"
                    >
                      {isActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Payment & Activate"}
                    </Button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 🌟 DIGITAL TAX INVOICE & RECEIPT MODAL */}
      <AnimatePresence>
        {viewingInvoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm print:p-0">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="bg-white rounded-3xl shadow-2xl p-6 md:p-8 w-full max-w-2xl overflow-hidden flex flex-col relative max-h-[90vh] border border-slate-100 print:shadow-none print:border-none print:max-h-none print:w-full"
            >
              <button
                type="button"
                onClick={() => setViewingInvoice(null)}
                className="absolute top-6 right-6 p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors z-10 print:hidden"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="overflow-y-auto custom-scrollbar pr-2 space-y-6">
                {/* Header */}
                <div className="flex justify-between items-start pb-4 border-b border-slate-100">
                  <div>
                    <h2 className="text-2xl font-black text-indigo-900">VidyaSanchalan SaaS</h2>
                    <p className="text-xs text-slate-400">Multi-Tenant Cloud School ERP Management</p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-xs bg-slate-100 px-3 py-1 rounded-lg">
                      {viewingInvoice.invoice_number}
                    </span>
                    <p className="text-[11px] text-slate-400 mt-1">Date: {viewingInvoice.created_at.slice(0, 10)}</p>
                  </div>
                </div>

                {/* Billed To */}
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="font-bold uppercase text-[10px] text-slate-400 tracking-wider">Billed To Institution</p>
                    <p className="font-bold text-sm text-slate-900 mt-1">{viewingInvoice.school_name}</p>
                    <p className="text-slate-500 font-mono">Code: {viewingInvoice.school_code}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold uppercase text-[10px] text-slate-400 tracking-wider">Billing Period</p>
                    <p className="font-bold text-slate-900 mt-1">
                      {viewingInvoice.billing_period_start} to {viewingInvoice.billing_period_end}
                    </p>
                    <p className="text-slate-500">Due Date: {viewingInvoice.due_date}</p>
                  </div>
                </div>

                {/* Line Item Table */}
                <div className="rounded-2xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 font-bold text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="p-3">Description</th>
                        <th className="p-3 text-center">Billing Model</th>
                        <th className="p-3 text-center">Student Snapshot</th>
                        <th className="p-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      <tr>
                        <td className="p-3 font-semibold text-slate-800">
                          School ERP Cloud Subscription & Licensing
                        </td>
                        <td className="p-3 text-center uppercase text-slate-600 font-mono text-[11px]">
                          {viewingInvoice.billing_model}
                        </td>
                        <td className="p-3 text-center text-slate-700">
                          {viewingInvoice.billing_model === "PER_STUDENT"
                            ? `${viewingInvoice.student_count} Students`
                            : "Fixed Flat"}
                        </td>
                        <td className="p-3 text-right font-bold text-slate-900">
                          ₹{Number(viewingInvoice.total_amount).toLocaleString("en-IN")}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Total & Status */}
                <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                  <div>
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                        viewingInvoice.status === "PAID"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : "bg-amber-100 text-amber-800 border border-amber-300"
                      }`}
                    >
                      {viewingInvoice.status === "PAID" ? "✓ PAYMENT RECEIVED" : "PENDING PAYMENT"}
                    </span>
                    {viewingInvoice.payment_reference && (
                      <p className="text-[11px] text-slate-500 mt-1 font-mono">
                        Ref: {viewingInvoice.payment_reference} ({viewingInvoice.payment_method})
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Total Billed Amount</p>
                    <p className="text-2xl font-black text-slate-900">
                      ₹{Number(viewingInvoice.total_amount).toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-slate-100 mt-4 print:hidden">
                <Button
                  variant="outline"
                  onClick={() => window.print()}
                  className="rounded-xl text-xs gap-2 font-semibold"
                >
                  <Printer className="w-4 h-4" />
                  Print / Save PDF
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setViewingInvoice(null)}
                  className="rounded-xl text-xs"
                >
                  Close
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
