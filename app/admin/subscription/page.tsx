"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  getCurrentSchoolSubscription,
  getSchoolInvoices,
  SchoolSubscription,
  SchoolInvoice,
} from "@/lib/subscriptions";
import { TrialBanner } from "@/components/subscription/TrialBanner";
import {
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Download,
  Sparkles,
  Users,
  Building2,
  Calendar,
  Clock,
  ShieldCheck,
  RefreshCw,
  ArrowRight,
  FileText,
} from "lucide-react";

export default function SchoolAdminSubscriptionPage() {
  const [sub, setSub] = useState<SchoolSubscription | null>(null);
  const [enabledModules, setEnabledModules] = useState<string[]>([]);
  const [invoices, setInvoices] = useState<SchoolInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  async function loadData() {
    setLoading(true);
    setErrorMsg("");
    try {
      const data = await getCurrentSchoolSubscription();
      setSub(data.subscription);
      setEnabledModules(data.enabled_modules || []);

      if (data.subscription?.school) {
        const invData = await getSchoolInvoices(data.subscription.school);
        setInvoices(invData);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load subscription details.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const allModulesList = [
    { code: "STUDENT", name: "Student Management" },
    { code: "STAFF", name: "Staff & Teacher Management" },
    { code: "ATTENDANCE", name: "Attendance System" },
    { code: "FEES", name: "Fee Management & Ledger" },
    { code: "EXAM", name: "Examination & Report Cards" },
    { code: "TIMETABLE", name: "Timetable & Schedules" },
    { code: "HOMEWORK", name: "Homework & Assignments" },
    { code: "LIBRARY", name: "Library Management" },
    { code: "INVENTORY", name: "Inventory & Stock" },
    { code: "TRANSPORT", name: "Transport & Vehicles" },
    { code: "HOSTEL", name: "Hostel & Rooms" },
    { code: "PAYROLL", name: "Staff Payroll" },
    { code: "COMMUNICATION", name: "Notifications & Notices" },
    { code: "REPORTS", name: "Advanced Analytics & Reports" },
    { code: "CERTIFICATES", name: "Certificates Generator" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-600 font-medium">
          <RefreshCw className="w-5 h-5 animate-spin text-indigo-600" />
          <span>Loading subscription dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      <TrialBanner />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Building2 className="w-7 h-7 text-indigo-600" />
              <span>School Subscription & Billing</span>
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Manage your school's plan, usage limits, invoices, and billing renewals.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 transition-all"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <Link
              href="/admin/subscription/checkout"
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2.5 rounded-lg shadow-sm text-sm transition-all hover:shadow hover:scale-[1.02] active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300" />
              <span>Upgrade / Renew Plan</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-3 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {sub && (
          <>
            {/* Top Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Card 1: Current Plan */}
              <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 -mr-6 -mt-6 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none" />
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-semibold tracking-wider text-indigo-200 uppercase">
                    Current Plan
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      sub.status === "ACTIVE"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                        : sub.status === "TRIAL"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                        : "bg-red-500/20 text-red-300 border border-red-500/40"
                    }`}
                  >
                    {sub.status}
                  </span>
                </div>

                <h2 className="text-2xl font-extrabold tracking-tight text-white mb-1">
                  {sub.plan_name || (sub.plan_type === "TRIAL" ? "Free Trial" : "Custom Plan")}
                </h2>

                <p className="text-sm text-indigo-200 mb-6">
                  {sub.billing_model === "PER_STUDENT"
                    ? `Per Student Billing (₹${sub.per_student_rate}/student/${sub.billing_cycle.toLowerCase()})`
                    : `Flat Rate (₹${sub.flat_amount}/${sub.billing_cycle.toLowerCase()})`}
                </p>

                <div className="pt-4 border-t border-indigo-700/50 flex items-center justify-between text-xs text-indigo-200">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Expires: {sub.due_date}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-semibold text-white">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>{sub.days_left} Days Left</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Live Student Usage */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Student Capacity & Usage
                    </span>
                    <Users className="w-5 h-5 text-indigo-600" />
                  </div>

                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-3xl font-extrabold text-slate-900">
                      {sub.live_student_count}
                    </span>
                    <span className="text-sm font-semibold text-slate-500">Active Students</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-100 rounded-full h-2.5 mb-3 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, (sub.live_student_count / 1000) * 100)}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-600 flex items-center justify-between">
                  <span>Billing Model:</span>
                  <span className="font-bold text-slate-800">{sub.billing_model}</span>
                </div>
              </div>

              {/* Card 3: Estimated Amount Payable */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Current Billing Amount
                    </span>
                    <CreditCard className="w-5 h-5 text-emerald-600" />
                  </div>

                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-3xl font-extrabold text-slate-900">
                      ₹{sub.calculated_amount.toLocaleString("en-IN")}
                    </span>
                    <span className="text-xs text-slate-500">/{sub.billing_cycle.toLowerCase()}</span>
                  </div>

                  <p className="text-xs text-slate-500 mb-4">
                    Based on your live student count of {sub.live_student_count} active students.
                  </p>
                </div>

                <Link
                  href="/admin/subscription/checkout"
                  className="w-full text-center bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2.5 rounded-xl text-xs transition-all shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Renew or Pay Invoice</span>
                </Link>
              </div>
            </div>

            {/* Middle Section: Module Access Checklist */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 mb-8">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-indigo-600" />
                    <span>Included Plan Modules & Features</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Modules unlocked by your current subscription plan.
                  </p>
                </div>

                <span className="text-xs font-semibold px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100">
                  {enabledModules.length} / {allModulesList.length} Enabled
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {allModulesList.map((m) => {
                  const isEnabled = enabledModules.includes(m.code);
                  return (
                    <div
                      key={m.code}
                      className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                        isEnabled
                          ? "bg-emerald-50/50 border-emerald-200 text-slate-800"
                          : "bg-slate-50 border-slate-200/80 text-slate-400 opacity-60"
                      }`}
                    >
                      <span className="text-xs font-medium truncate">{m.name}</span>
                      {isEnabled ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 ml-2" />
                      ) : (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded">
                          Upgrade
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Section: Invoices & Payment History */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    <span>Subscription Invoices & Receipts</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Complete invoice history and payment status for your school.
                  </p>
                </div>
              </div>

              {invoices.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-sm">
                  No invoices found for this school yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="py-3.5 px-6">Invoice #</th>
                        <th className="py-3.5 px-6">Billing Cycle</th>
                        <th className="py-3.5 px-6">Student Count</th>
                        <th className="py-3.5 px-6">Amount</th>
                        <th className="py-3.5 px-6">Status</th>
                        <th className="py-3.5 px-6">Invoice Date</th>
                        <th className="py-3.5 px-6 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {invoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-4 px-6 font-bold text-slate-900">
                            {inv.invoice_number}
                          </td>
                          <td className="py-4 px-6">{inv.billing_cycle || inv.billing_model}</td>
                          <td className="py-4 px-6">{inv.student_count} Students</td>
                          <td className="py-4 px-6 font-bold text-slate-900">
                            ₹{Number(inv.total_amount).toLocaleString("en-IN")}
                          </td>
                          <td className="py-4 px-6">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                                inv.status === "PAID"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : inv.status === "PENDING"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {inv.status}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            {new Date(inv.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-4 px-6 text-right">
                            <button
                              onClick={() => window.print()}
                              className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-semibold hover:underline"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Receipt</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
