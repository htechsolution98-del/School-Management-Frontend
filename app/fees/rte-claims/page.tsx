"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileSpreadsheet,
  ShieldCheck,
  DollarSign,
  Users,
  Download,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Loader2,
  Sparkles,
  Building,
  GraduationCap,
  Percent,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/lib/config";
import { fetchWithAuth } from "@/lib/auth";

interface ClassQuota {
  class_id: number;
  class_name: string;
  total_students: number;
  rte_students: number;
  percentage: number;
  compliant: boolean;
}

interface RTEStudent {
  id: number;
  name: string;
  gr_no: string;
  roll_no: string;
  school_class: string;
  division: string;
  admission_date: string;
  reimbursement_claim_amount: number;
  claim_status: string;
}

interface RTESummaryResponse {
  school_name: string;
  standard_reimbursement_rate: number;
  total_rte_students: number;
  total_students: number;
  overall_rte_percentage: number;
  total_estimated_claim: number;
  class_quota: ClassQuota[];
  students: RTEStudent[];
}

export default function RTEClaimsPage() {
  const [data, setData] = useState<RTESummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const loadRTEData = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/rte/summary/`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });

      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRTEData();
  }, []);

  const handleExportClaim = () => {
    if (!data || data.students.length === 0) return;
    const csvContent =
      "data:text/csv;charset=utf-8," +
      ["GR Number,Student Name,Class,Division,Claim Amount,Status"]
        .concat(
          data.students.map(
            (s) =>
              `"${s.gr_no}","${s.name}","${s.school_class}","${s.division}","${s.reimbursement_claim_amount}","${s.claim_status}"`
          )
        )
        .join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `RTE_Reimbursement_Claim_${data.school_name || "School"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setToast("Reimbursement claim report exported successfully!");
    setTimeout(() => setToast(null), 3500);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 shadow-xl"
          >
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <span className="text-sm font-medium">{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-800 via-emerald-800 to-slate-900 p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-emerald-200 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5" /> RTE Mandate & Claims
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">RTE Fee Reimbursement & Quotas</h1>
            <p className="text-emerald-100 max-w-xl text-sm md:text-base">
              Track 25% statutory seat quota fulfillment, compile government fee reimbursement claim dockets, and maintain 100% fee-waiver verification.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleExportClaim}
              disabled={!data || data.students.length === 0}
              className="bg-white text-emerald-900 hover:bg-emerald-50 font-semibold shadow-lg"
            >
              <Download className="mr-1.5 h-4 w-4" /> Export Claim Dossier (CSV)
            </Button>
            <Button
              variant="outline"
              onClick={loadRTEData}
              disabled={loading}
              className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-teal-600" />
          <p className="text-sm text-gray-500 mt-2 font-medium">Computing RTE quota & reimbursement claims...</p>
        </div>
      ) : !data ? (
        <div className="rounded-3xl border border-gray-200 bg-white p-12 text-center shadow-sm">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-300 mb-2" />
          <p className="font-bold text-gray-700">Unable to load RTE records</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* KPI Metrics */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: "RTE Enrolled Students",
                value: data.total_rte_students,
                sub: `Total: ${data.total_students} Enrolled`,
                icon: Users,
                color: "text-teal-600",
                bg: "bg-teal-50",
                border: "border-teal-100",
              },
              {
                label: "Overall RTE Quota",
                value: `${data.overall_rte_percentage}%`,
                sub: "Statutory Mandate: 25.0%",
                icon: Percent,
                color: data.overall_rte_percentage >= 25 ? "text-emerald-600" : "text-amber-600",
                bg: data.overall_rte_percentage >= 25 ? "bg-emerald-50" : "bg-amber-50",
                border: data.overall_rte_percentage >= 25 ? "border-emerald-100" : "border-amber-100",
              },
              {
                label: "Standard Claim Rate",
                value: `₹${data.standard_reimbursement_rate.toLocaleString()}`,
                sub: "Per Student / Academic Year",
                icon: DollarSign,
                color: "text-indigo-600",
                bg: "bg-indigo-50",
                border: "border-indigo-100",
              },
              {
                label: "Estimated State Claim",
                value: `₹${data.total_estimated_claim.toLocaleString()}`,
                sub: "Eligible for Gov. Submission",
                icon: FileSpreadsheet,
                color: "text-emerald-600",
                bg: "bg-emerald-50",
                border: "border-emerald-100",
              },
            ].map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className={`rounded-2xl border ${stat.border} bg-white p-5 shadow-sm`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{stat.label}</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                      <p className="text-xs text-gray-500 mt-1 font-medium">{stat.sub}</p>
                    </div>
                    <div className={`p-3.5 rounded-2xl ${stat.bg} ${stat.color} shadow-inner`}>
                      <Icon className="h-6 w-6" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Class-wise Quota Tracking */}
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="border-b border-gray-100 pb-4 mb-4">
              <h3 className="text-lg font-bold text-gray-900">Class-Wise RTE Quota Fulfillment (25% Target)</h3>
              <p className="text-xs text-gray-500">Monitor whether each standard satisfies the statutory reservation target</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.class_quota.map((cq) => (
                <div key={cq.class_id} className="rounded-2xl border border-gray-100 bg-slate-50/70 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-900 text-sm">{cq.class_name}</span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        cq.compliant
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}
                    >
                      {cq.percentage}% RTE
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>RTE Enrolled: {cq.rte_students}</span>
                      <span>Total: {cq.total_students}</span>
                    </div>
                    <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          cq.compliant ? "bg-emerald-500" : "bg-amber-500"
                        }`}
                        style={{ width: `${Math.min(cq.percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Enrolled RTE Students Claim List */}
          <div className="rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">RTE Reimbursement Claim Roster</h3>
                <p className="text-xs text-gray-500">Individual student records with 100% fee waiver and claim entitlement</p>
              </div>
              <Button size="sm" onClick={handleExportClaim} className="bg-emerald-700 hover:bg-emerald-800 text-white">
                <Download className="mr-1.5 h-3.5 w-3.5" /> Download Dossier
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4">Student & GR No</th>
                    <th className="px-6 py-4">Class & Division</th>
                    <th className="px-6 py-4">Admission Date</th>
                    <th className="px-6 py-4 text-right">Claim Amount</th>
                    <th className="px-6 py-4 text-center">Fee Status</th>
                    <th className="px-6 py-4 text-center">Claim Eligibility</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.students.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                        No RTE students enrolled for the current academic session.
                      </td>
                    </tr>
                  ) : (
                    data.students.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/70">
                        <td className="px-6 py-4">
                          <div className="font-bold text-gray-900">{s.name}</div>
                          <div className="text-xs text-gray-500 font-mono">GR: {s.gr_no || "N/A"}</div>
                        </td>
                        <td className="px-6 py-4 text-gray-700">
                          {s.school_class} {s.division ? `(${s.division})` : ""}
                        </td>
                        <td className="px-6 py-4 text-gray-600">{s.admission_date || "—"}</td>
                        <td className="px-6 py-4 text-right font-bold text-gray-900">
                          ₹{s.reimbursement_claim_amount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">
                            100% Waived
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                            <CheckCircle2 className="h-3 w-3" /> {s.claim_status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
