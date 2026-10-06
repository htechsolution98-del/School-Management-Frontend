"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  BadgeIndianRupee,
  CalendarDays,
  CheckCircle2,
  FileText,
  GraduationCap,
  Loader2,
  Printer,
  User,
  X,
} from "lucide-react";
import { fetchWithAuth } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";
import { formatBillingPeriod, formatCurrency } from "@/lib/fees";
import type { Payment } from "@/types/fees";

export default function ReceiptModal({
  isOpen,
  onClose,
  receiptNumber,
  initialPayments,
}: {
  isOpen: boolean;
  onClose: () => void;
  receiptNumber?: string | null;
  initialPayments?: Payment[] | null;
}) {
  const [loading, setLoading] = useState(false);
  const [payments, setPayments] = useState<Payment[]>(initialPayments || []);
  const [error, setError] = useState("");

  const loadReceipt = useCallback(async () => {
    if (initialPayments && initialPayments.length > 0) {
      setPayments(initialPayments);
      setError("");
      return;
    }
    if (!receiptNumber) return;

    setLoading(true);
    setError("");
    setPayments([]);
    try {
      const res = await fetchWithAuth(
        `${API_BASE_URL}/student-fee-payment/?receipt_number=${encodeURIComponent(receiptNumber)}`,
      );
      if (!res.ok) throw new Error("Failed to fetch receipt");
      const data = await res.json();
      const results: Payment[] = Array.isArray(data) ? data : (data.results || []);
      if (results && results.length > 0) {
        setPayments(results);
      } else {
        setError("Receipt not found");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [receiptNumber, initialPayments]);

  useEffect(() => {
    if (isOpen) {
      if (initialPayments && initialPayments.length > 0) {
        setPayments(initialPayments);
        setError("");
      } else if (receiptNumber) {
        loadReceipt();
      }
    }
  }, [isOpen, receiptNumber, initialPayments, loadReceipt]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #printable-receipt, #printable-receipt * { visibility: visible; }
          #printable-receipt {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            padding: 24px;
            background: white;
            margin: 0;
            z-index: 9999;
            overflow: visible;
          }
          .receipt-print-hide { display: none !important; }
        }
      `}</style>

      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm receipt-print-hide"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto flex flex-col">
        <div className="receipt-print-hide flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10 shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">
            {payments.length > 1 ? `Combined Fee Receipt (${payments.length} Items)` : "Fee Receipt"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 size={32} className="animate-spin text-blue-500" />
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-500 font-medium">
              {error}
            </div>
          ) : payments.length > 0 ? (
            <ReceiptContent payments={payments} />
          ) : null}
        </div>

        {payments.length > 0 && (
          <div className="receipt-print-hide p-5 border-t border-gray-100 bg-gray-50 rounded-b-2xl shrink-0 flex justify-end">
            <button
              onClick={() => window.print()}
              className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
            >
              <Printer size={16} /> Print Receipt
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ReceiptContent({ payments }: { payments: Payment[] }) {
  const primaryPayment = payments[0];
  const paymentStatus = getPaymentStatus(primaryPayment);
  const refValue =
    primaryPayment.transaction_id ||
    primaryPayment.razorpay_payment_id ||
    primaryPayment.razorpay_order_id ||
    "-";

  const isMultiItem = payments.length > 1;

  // Calculate totals across all items in receipt
  const totalBase = payments.reduce((sum, p) => sum + parseFloat(p.fee_amount || "0"), 0);
  const totalPenalty = payments.reduce((sum, p) => sum + parseFloat(p.fee_penalty || "0"), 0);
  const totalDiscount = payments.reduce((sum, p) => sum + parseFloat(p.fee_discount || "0"), 0);
  const totalReceived = payments.reduce((sum, p) => sum + parseFloat(p.amount || "0"), 0);

  return (
    <div id="printable-receipt" className="space-y-5 text-gray-900">
      <div className="flex items-start justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            {primaryPayment.school_name || "School"}
          </p>
          <h3 className="text-2xl font-bold mt-1">
            {isMultiItem ? "Consolidated Fee Receipt" : "Fee Receipt"}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Official student fee payment receipt
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Receipt No.</p>
          <p className="font-mono font-bold text-gray-900">
            {primaryPayment.receipt_number || "-"}
          </p>
          <StatusPill label={paymentStatus.label} tone={paymentStatus.tone} />
        </div>
      </div>

      <SectionTitle icon={User} title="Student Details" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Info label="Full Name" value={primaryPayment.student_name || "-"} wide />
        <Info label="Class" value={primaryPayment.student_class || "-"} />
        <Info label="Division" value={primaryPayment.student_division || "-"} />
        <Info label="GR No." value={primaryPayment.student_gr_no || "-"} />
      </div>

      {isMultiItem ? (
        <>
          <SectionTitle icon={GraduationCap} title={`Fee Items Breakdown (${payments.length} Items)`} />
          <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase font-semibold">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">Fee / Period</th>
                  <th className="p-3 text-right">Base Fee</th>
                  <th className="p-3 text-right">Late Fee</th>
                  <th className="p-3 text-right">Discount</th>
                  <th className="p-3 text-right">Amount Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map((p, idx) => (
                  <tr key={p.id} className="hover:bg-gray-50/50">
                    <td className="p-3 text-gray-400 font-mono">{idx + 1}</td>
                    <td className="p-3">
                      <p className="font-semibold text-gray-900">{p.feetype_name}</p>
                      <p className="text-[11px] text-gray-500">
                        {formatBillingPeriod(p.fee_billing_period || "")} {p.is_rte_govt_claim ? "• 🏛️ RTE Claim" : ""}
                      </p>
                    </td>
                    <td className="p-3 text-right text-gray-700">{formatCurrency(p.fee_amount || 0)}</td>
                    <td className="p-3 text-right text-red-600">
                      {parseFloat(p.fee_penalty || "0") > 0 ? `+${formatCurrency(p.fee_penalty || "0")}` : "₹0"}
                    </td>
                    <td className="p-3 text-right text-green-600">
                      {parseFloat(p.fee_discount || "0") > 0 ? `-${formatCurrency(p.fee_discount || "0")}` : "₹0"}
                    </td>
                    <td className="p-3 text-right font-bold text-gray-900">{formatCurrency(p.amount || 0)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 font-bold border-t border-gray-200 text-gray-900">
                <tr>
                  <td colSpan={2} className="p-3 text-right">Total Summary:</td>
                  <td className="p-3 text-right">{formatCurrency(totalBase)}</td>
                  <td className="p-3 text-right text-red-600">{formatCurrency(totalPenalty)}</td>
                  <td className="p-3 text-right text-green-600">-{formatCurrency(totalDiscount)}</td>
                  <td className="p-3 text-right text-blue-700 text-sm font-extrabold">{formatCurrency(totalReceived)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      ) : (
        <>
          <SectionTitle icon={GraduationCap} title="Fee Details" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Info label="Fee Type" value={primaryPayment.feetype_name || "-"} />
            <Info label="Billing Cycle" value={billingCycleLabel(primaryPayment.fee_billing_cycle)} />
            <Info
              label="Billing Period"
              value={formatBillingPeriod(primaryPayment.fee_billing_period || "")}
            />
            <Info label="Academic Year" value={primaryPayment.academic_year_name || "-"} />
            <Info label="Due Date" value={formatDate(primaryPayment.fee_due_date)} />
            <Info label="Fee Status" value={getFeeStatusLabel(primaryPayment.fee_status)} />
            <Info label="Student Fee ID" value={String(primaryPayment.student_fee || "-")} />
            <Info label="Payment ID" value={String(primaryPayment.id)} />
            {primaryPayment.is_rte_govt_claim && (
              <Info label="Fee Classification" value="RTE Govt Reimbursement Claim" />
            )}
          </div>

          <SectionTitle icon={BadgeIndianRupee} title="Amount Breakup" />
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <AmountRow label="Base Fee Amount" value={primaryPayment.fee_amount} />
            <AmountRow
              label="Penalty / Late Fee"
              value={primaryPayment.fee_penalty}
              tone="red"
              prefix="+"
            />
            <AmountRow
              label="Discount"
              value={primaryPayment.fee_discount}
              tone="green"
              prefix="-"
            />
            <AmountRow
              label="Total Payable"
              value={primaryPayment.fee_payable_amount}
              strong
            />
            <AmountRow
              label={primaryPayment.payer_type === "government" ? "Govt Claim Amount Received" : "Amount Received in This Receipt"}
              value={primaryPayment.amount}
              strong
              tone="blue"
            />
            <AmountRow label="Total Paid Till Now" value={primaryPayment.fee_paid_amount} />
            <AmountRow
              label="Remaining Balance"
              value={primaryPayment.fee_balance_amount || primaryPayment.balance_after_payment}
              tone="red"
              strong
            />
          </div>
        </>
      )}

      {isMultiItem && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-blue-700 font-semibold uppercase tracking-wider">Grand Total Paid</p>
            <p className="text-2xl font-black text-blue-900">{formatCurrency(totalReceived)}</p>
          </div>
          <div className="text-right text-xs text-blue-800">
            <p>{payments.length} fee installments paid in full</p>
            <p className="text-[11px] text-blue-600 mt-0.5">Receipt: {primaryPayment.receipt_number}</p>
          </div>
        </div>
      )}

      <SectionTitle icon={CalendarDays} title="Payment Details" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Info label="Payment Date" value={formatDateTime(primaryPayment.payment_date)} />
        <Info label="Payer Type" value={primaryPayment.payer_type === "government" ? "Government (RTE Claim)" : "Student / Guardian"} />
        <Info label="Payment Mode" value={primaryPayment.payment_mode === "govt_rte" ? "Govt RTE Direct Credit" : capitalize(primaryPayment.payment_mode)} />
        <Info label="Reference / Transaction ID" value={refValue} wide />
        <Info label="Collected By" value={primaryPayment.collected_by_username || "-"} />
        <Info label="Verified By" value={primaryPayment.verified_by_username || "-"} />
        <Info label="Verified At" value={formatDateTime(primaryPayment.verified_at)} />
        <Info label="Clearance Status" value={paymentStatus.label} />
      </div>

      {primaryPayment.note && (
        <>
          <SectionTitle icon={FileText} title="Note" />
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
            {primaryPayment.note}
          </div>
        </>
      )}

      <div className="grid grid-cols-2 gap-8 pt-10 text-sm">
        <div className="border-t border-gray-300 pt-2 text-gray-600">
          Receiver Signature
        </div>
        <div className="border-t border-gray-300 pt-2 text-gray-600 text-right">
          Authorized Signature
        </div>
      </div>

      <p className="text-center text-xs text-gray-400 pt-2">
        This receipt is system generated and valid subject to payment clearance.
      </p>
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  title,
}: {
  icon: React.ElementType;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <Icon size={16} className="text-blue-600" />
      <h4 className="text-sm font-bold uppercase tracking-wide text-gray-700">
        {title}
      </h4>
    </div>
  );
}

function Info({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-gray-200 bg-gray-50 p-3 min-w-0 ${
        wide ? "col-span-2" : ""
      }`}
    >
      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="text-sm font-semibold text-gray-900 mt-1 break-words">
        {value || "-"}
      </p>
    </div>
  );
}

function AmountRow({
  label,
  value,
  tone,
  prefix = "",
  strong = false,
}: {
  label: string;
  value?: string | number | null;
  tone?: "red" | "green" | "blue";
  prefix?: string;
  strong?: boolean;
}) {
  const color =
    tone === "red"
      ? "text-red-600"
      : tone === "green"
        ? "text-green-600"
        : tone === "blue"
          ? "text-blue-600"
          : "text-gray-900";
  const formatted = formatCurrency(value ?? 0);

  return (
    <div
      className={`flex items-center justify-between gap-4 px-4 py-3 border-b border-gray-100 last:border-b-0 ${
        strong ? "bg-gray-50" : "bg-white"
      }`}
    >
      <span className={`text-sm ${strong ? "font-bold" : "font-medium"}`}>
        {label}
      </span>
      <span className={`text-sm ${strong ? "font-bold" : "font-semibold"} ${color}`}>
        {prefix && parseFloat(String(value || 0)) > 0 ? `${prefix} ` : ""}
        {formatted}
      </span>
    </div>
  );
}

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: "green" | "red" | "orange";
}) {
  const className =
    tone === "green"
      ? "bg-green-100 text-green-700 border-green-200"
      : tone === "orange"
        ? "bg-orange-100 text-orange-700 border-orange-200"
        : "bg-red-100 text-red-700 border-red-200";

  return (
    <span
      className={`inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full border text-xs font-semibold ${className}`}
    >
      <CheckCircle2 size={11} />
      {label}
    </span>
  );
}

function getPaymentStatus(payment: Payment): {
  label: string;
  tone: "green" | "red" | "orange";
} {
  if (payment.is_bounced) return { label: "Bounced", tone: "red" };
  if (payment.payment_mode?.toLowerCase() === "cheque" && !payment.is_verified) {
    return { label: "Pending Clearance", tone: "orange" };
  }
  return { label: "Cleared", tone: "green" };
}

function getFeeStatusLabel(status?: string) {
  const map: Record<string, string> = {
    paid: "Paid",
    partial: "Partial",
    partially_paid: "Partial",
    pending: "Pending",
    unpaid: "Unpaid",
    overdue: "Overdue",
    cancelled: "Cancelled",
  };
  return status ? map[status] || capitalize(status) : "-";
}

function billingCycleLabel(cycle?: string) {
  const map: Record<string, string> = {
    monthly: "Monthly",
    quarterly: "Quarterly",
    half_yearly: "Half Yearly",
    yearly: "Yearly",
    single: "Single",
  };
  return cycle ? map[cycle] || capitalize(cycle.replaceAll("_", " ")) : "-";
}

function formatDate(value?: string | null) {
  const date = parseDate(value);
  if (!date) return "-";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value?: string | null) {
  const date = parseDate(value);
  if (!date) return "-";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function parseDate(value?: string | null) {
  if (!value) return null;

  const indianDate = value.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  const normalized = indianDate
    ? `${indianDate[3]}-${indianDate[2]}-${indianDate[1]}T00:00:00`
    : value;

  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function capitalize(value?: string | null) {
  if (!value) return "-";
  return value.charAt(0).toUpperCase() + value.slice(1);
}
