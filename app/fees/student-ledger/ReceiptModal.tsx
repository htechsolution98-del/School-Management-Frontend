"use client";

import React, { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div id="printable-receipt-modal" className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 5mm 8mm;
          }
          html, body {
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            background: #ffffff !important;
            width: 100% !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          header, nav, aside, footer, #app-sidebar, .sidebar, .navbar, .receipt-print-hide {
            display: none !important;
          }
          body > *:not(#printable-receipt-modal) {
            display: none !important;
          }
          body * {
            visibility: hidden;
          }
          #printable-receipt-modal,
          #printable-receipt-modal * {
            visibility: visible;
          }
          #printable-receipt-modal {
            position: static !important;
            left: auto !important;
            top: auto !important;
            display: block !important;
            padding: 0 !important;
            margin: 0 !important;
            background: transparent !important;
            width: 100% !important;
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
          }
          #printable-receipt-card {
            position: static !important;
            max-width: 100% !important;
            width: 100% !important;
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
            max-height: none !important;
            height: auto !important;
          }
          #printable-receipt-card > div {
            overflow: visible !important;
            max-height: none !important;
            height: auto !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          #printable-receipt {
            position: relative !important;
            left: auto !important;
            top: auto !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            box-shadow: none !important;
            border: none !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
            page-break-before: avoid !important;
            break-inside: avoid !important;
            break-after: avoid !important;
          }
          #printable-receipt .print-compact-gap {
            gap: 6px !important;
          }
          #printable-receipt .print-compact-p {
            padding: 4px 6px !important;
          }
          #printable-receipt .print-compact-py {
            padding-top: 2px !important;
            padding-bottom: 2px !important;
          }
          #printable-receipt .print-compact-space {
            margin-top: 2px !important;
            margin-bottom: 2px !important;
            padding-bottom: 4px !important;
          }
          #printable-receipt .print-compact-pt {
            padding-top: 6px !important;
          }
          .print\:break-inside-avoid,
          [class*="print:break-inside-avoid"] {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-md receipt-print-hide"
        onClick={onClose}
      />
      <div id="printable-receipt-card" className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto flex flex-col">
        <div className="receipt-print-hide flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10 shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">
            {payments.length > 1 ? `Combined Fee Receipt (${payments.length} Items)` : "Fee Receipt"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <div className="p-6 print:p-2 flex-1 overflow-y-auto">
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
    </div>,
    document.body
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

  const cashPayment =
    payments.find((p) => p.payment_details || p.payment_mode?.toLowerCase() === "cash") ||
    primaryPayment;
  const cashInfo = formatCashBreakdown(cashPayment);

  const schoolName =
    primaryPayment.school_name ||
    (typeof window !== "undefined" ? localStorage.getItem("school_name") : null) ||
    "JUJUTSU KAISEN";

  const rawLogo =
    primaryPayment.school_logo ||
    (typeof window !== "undefined" ? localStorage.getItem("school_logo") : null);

  const resolveLogoUrl = (url?: string | null) => {
    if (!url) return null;
    const clean = url.trim();
    if (!clean) return null;
    if (clean.startsWith("http://") || clean.startsWith("https://") || clean.startsWith("data:")) {
      return clean;
    }
    const base = API_BASE_URL.replace(/\/api\/?$/, "");
    return `${base}${clean.startsWith("/") ? "" : "/"}${clean}`;
  };

  const schoolLogo = resolveLogoUrl(rawLogo);

  return (
    <div id="printable-receipt" className="space-y-4 print:space-y-2 text-gray-900 print:text-[12px] print:p-0">
      <div className="flex items-start justify-between gap-4 border-b border-gray-200 pb-3 print-compact-space print:pb-1.5 print:mb-1">
        <div className="flex items-center gap-3 print:gap-2">
          {schoolLogo ? (
            <img
              src={schoolLogo}
              alt={schoolName}
              className="w-14 h-14 object-contain rounded-xl border border-gray-200 bg-white p-1 shrink-0 print:w-10 print:h-10 print:p-0.5 shadow-xs"
              onError={(e) => {
                (e.target as HTMLElement).style.display = "none";
              }}
            />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 shrink-0 font-black text-lg print:w-9 print:h-9 print:text-base">
              {schoolName.charAt(0)}
            </div>
          )}
          <div>
            <p className="text-xs print:text-[10px] font-bold uppercase tracking-wider text-blue-900 leading-tight">
              {schoolName}
            </p>
            <h3 className="text-2xl font-black text-gray-900 tracking-tight print:text-base print:leading-tight">
              {isMultiItem ? "Consolidated Fee Receipt" : "Fee Receipt"}
            </h3>
            <p className="text-xs print:text-[10px] text-gray-500 leading-tight">
              Official student fee payment receipt
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs print:text-[10px] text-gray-500 leading-tight">Receipt No.</p>
          <p className="font-mono font-bold text-gray-900 text-sm print:text-xs">
            {primaryPayment.receipt_number || "-"}
          </p>
          <StatusPill label={paymentStatus.label} tone={paymentStatus.tone} />
        </div>
      </div>

      <SectionTitle icon={User} title="Student Details" />
      <div className="grid grid-cols-2 md:grid-cols-4 print:grid-cols-4 gap-2.5 print:gap-1.5 print:gap-y-1.5 print-compact-gap">
        <Info label="Full Name" value={primaryPayment.student_name || "-"} wide />
        <Info
          label="Class & Section"
          value={
            primaryPayment.student_class
              ? `${primaryPayment.student_class}${primaryPayment.student_division ? ` - ${primaryPayment.student_division} Section` : ""}`
              : (primaryPayment.student_division ? `${primaryPayment.student_division} Section` : "-")
          }
        />
        <Info label="GR No." value={primaryPayment.student_gr_no || "-"} />
      </div>

      {isMultiItem ? (
        <div className="print:break-inside-avoid">
          <SectionTitle icon={GraduationCap} title={`Fee Items Breakdown (${payments.length} Items)`} />
          <div className="border border-gray-200 rounded-xl print:rounded-lg overflow-hidden shadow-sm print:shadow-none mt-1 print:mt-0.5">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase font-semibold">
                <tr>
                  <th className="p-3 print:p-1.5 print:text-[10px]">#</th>
                  <th className="p-3 print:p-1.5 print:text-[10px]">Fee / Particulars</th>
                  <th className="p-3 print:p-1.5 print:text-[10px] text-right">Base Fee</th>
                  <th className="p-3 print:p-1.5 print:text-[10px] text-right">Late Fee</th>
                  <th className="p-3 print:p-1.5 print:text-[10px] text-right">Discount</th>
                  <th className="p-3 print:p-1.5 print:text-[10px] text-right">Amount Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map((p, idx) => (
                  <tr key={p.id} className="hover:bg-gray-50/50">
                    <td className="p-3 print:p-1.5 text-gray-400 font-mono print:text-[10px]">{idx + 1}</td>
                    <td className="p-3 print:p-1.5">
                      <p className="font-semibold text-gray-900 print:text-xs">{p.feetype_name}</p>
                      {(() => {
                        const particularText = p.fee_description || p.fee_discount_reference;
                        if (!particularText || particularText.includes("[Cash Recd")) return null;
                        return (
                          <p className="text-[11px] print:text-[9.5px] font-medium text-amber-900 bg-amber-50 rounded px-1.5 py-0.5 mt-0.5 border border-amber-200 w-fit">
                            <span className="font-bold uppercase text-[9px] mr-1 text-amber-800">Particulars:</span>
                            {particularText}
                          </p>
                        );
                      })()}
                      <p className="text-[11px] print:text-[9.5px] text-gray-500 mt-0.5">
                        {formatBillingPeriod(p.fee_billing_period || "")} {p.is_rte_govt_claim ? "• 🏛️ RTE Claim" : ""}
                      </p>
                    </td>
                    <td className="p-3 print:p-1.5 text-right text-gray-700 print:text-xs">{formatCurrency(p.fee_amount || 0)}</td>
                    <td className="p-3 print:p-1.5 text-right text-red-600 print:text-xs">
                      {parseFloat(p.fee_penalty || "0") > 0 ? `+${formatCurrency(p.fee_penalty || "0")}` : "₹0"}
                    </td>
                    <td className="p-3 print:p-1.5 text-right text-green-600 print:text-xs">
                      {parseFloat(p.fee_discount || "0") > 0 ? `-${formatCurrency(p.fee_discount || "0")}` : "₹0"}
                    </td>
                    <td className="p-3 print:p-1.5 text-right font-bold text-gray-900 print:text-xs">{formatCurrency(p.amount || 0)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 font-bold border-t border-gray-200 text-gray-900">
                <tr>
                  <td colSpan={2} className="p-3 print:p-1.5 text-right print:text-xs">Total Summary:</td>
                  <td className="p-3 print:p-1.5 text-right print:text-xs">{formatCurrency(totalBase)}</td>
                  <td className="p-3 print:p-1.5 text-right text-red-600 print:text-xs">{formatCurrency(totalPenalty)}</td>
                  <td className="p-3 print:p-1.5 text-right text-green-600 print:text-xs">-{formatCurrency(totalDiscount)}</td>
                  <td className="p-3 print:p-1.5 text-right text-blue-700 text-sm print:text-xs font-extrabold">{formatCurrency(totalReceived)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ) : (
        <>
          <div>
            <SectionTitle icon={GraduationCap} title="Fee Details" />
            <div className="grid grid-cols-2 md:grid-cols-4 print:grid-cols-4 gap-2.5 print:gap-1.5 print:gap-y-1.5 print-compact-gap mt-1 print:mt-0.5">
              <Info label="Fee Structure / Type" value={primaryPayment.feetype_name || "-"} />
              {(() => {
                const particularText = primaryPayment.fee_description || primaryPayment.fee_discount_reference;
                if (!particularText || particularText.includes("[Cash Recd")) return null;
                return (
                  <Info
                    label="Particulars"
                    value={particularText}
                    wide
                  />
                );
              })()}
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
                <Info label="Fee Classification" value="RTE Govt Reimbursement Claim" wide />
              )}
            </div>
          </div>

          <div className="print:break-inside-avoid">
            <SectionTitle icon={BadgeIndianRupee} title="Amount Breakup" />
            <div className="border border-gray-200 rounded-xl print:rounded-lg overflow-hidden mt-1 print:mt-0.5">
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
          </div>
        </>
      )}

      {isMultiItem && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl print:rounded-lg p-4 print:p-2 flex items-center justify-between print:break-inside-avoid">
          <div>
            <p className="text-xs print:text-[10px] text-blue-700 font-semibold uppercase tracking-wider">Grand Total Paid</p>
            <p className="text-2xl print:text-lg font-black text-blue-900">{formatCurrency(totalReceived)}</p>
          </div>
          <div className="text-right text-xs print:text-[10px] text-blue-800">
            <p>{payments.length} fee installments paid in full</p>
            <p className="text-[11px] print:text-[9.5px] text-blue-600 mt-0.5">Receipt: {primaryPayment.receipt_number}</p>
          </div>
        </div>
      )}

      <div>
        <SectionTitle icon={CalendarDays} title="Payment Details" />
        <div className="grid grid-cols-2 md:grid-cols-4 print:grid-cols-4 gap-3 print:gap-1.5 print:gap-y-1.5 mt-1 print:mt-0.5">
        <Info label="Payment Date" value={formatDateTime(primaryPayment.payment_date)} />
        <Info label="Payer Type" value={primaryPayment.payer_type === "government" ? "Government (RTE Claim)" : "Student / Guardian"} />
        <Info label="Payment Mode" value={primaryPayment.payment_mode === "govt_rte" ? "Govt RTE Direct Credit" : capitalize(primaryPayment.payment_mode)} />
        <Info label="Reference / Transaction ID" value={refValue} wide />
        <Info label="Collected By" value={primaryPayment.collected_by_username || "-"} />
        <Info label="Verified By" value={primaryPayment.verified_by_username || "-"} />
        <Info label="Verified At" value={formatDateTime(primaryPayment.verified_at)} />
        <Info label="Clearance Status" value={paymentStatus.label} />
      </div>
    </div>

      {(cashInfo.hasBreakdown || cashInfo.cleanNote) && (
        <div className="print:break-inside-avoid">
          <SectionTitle icon={FileText} title="Note" />
          <div className="rounded-xl print:rounded-lg border border-gray-200 bg-gray-50 p-3.5 print:p-2 text-xs md:text-sm print:text-xs text-gray-800 space-y-1 print:space-y-0.5 mt-1 print:mt-0.5">
            {cashInfo.hasBreakdown && (
              <p className="font-semibold text-gray-900 tracking-tight">
                {cashInfo.breakdown}
              </p>
            )}
            {cashInfo.cleanNote && (
              <p
                className={
                  cashInfo.hasBreakdown
                    ? "text-gray-600 text-xs italic pt-1 print:pt-0.5 border-t border-gray-200/60"
                    : "text-gray-700"
                }
              >
                {cashInfo.cleanNote}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="print:break-inside-avoid">
        <div className="grid grid-cols-2 gap-8 print:gap-6 pt-5 print:pt-2.5 text-sm">
          <div className="border-t border-gray-300 pt-1.5 text-gray-600 text-xs print:text-[11px]">
            Receiver Signature
          </div>
          <div className="border-t border-gray-300 pt-1.5 text-gray-600 text-right text-xs print:text-[11px]">
            Authorized Signature
          </div>
        </div>
        <p className="text-center text-xs print:text-[9.5px] text-gray-400 pt-2 print:pt-1 print:m-0 print:p-0">
          This receipt is system generated and valid subject to payment clearance.
        </p>
      </div>
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
    <div className="flex items-center gap-1.5 print:gap-1 pt-1 print:pt-0">
      <Icon size={16} className="text-blue-600 print:w-3.5 print:h-3.5 shrink-0" />
      <h4 className="text-sm print:text-xs font-bold uppercase tracking-wide text-gray-700">
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
      className={`rounded-xl print:rounded-lg border border-gray-200 bg-gray-50 p-3 print:p-1.5 min-w-0 ${
        wide ? "col-span-2" : ""
      }`}
    >
      <p className="text-[11px] print:text-[9.5px] font-medium uppercase tracking-wide text-gray-500 leading-tight">
        {label}
      </p>
      <p className="text-sm print:text-[11.5px] font-semibold text-gray-900 mt-1 print:mt-0.5 break-words leading-snug">
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
      className={`flex items-center justify-between gap-4 px-4 py-3 print:px-3 print:py-1 border-b border-gray-100 last:border-b-0 ${
        strong ? "bg-gray-50" : "bg-white"
      }`}
    >
      <span className={`text-sm print:text-xs ${strong ? "font-bold" : "font-medium"}`}>
        {label}
      </span>
      <span className={`text-sm print:text-xs ${strong ? "font-bold" : "font-semibold"} ${color}`}>
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
      className={`inline-flex items-center gap-1 mt-2 print:mt-0.5 px-2 print:px-1.5 py-0.5 print:py-0 rounded-full border text-xs print:text-[10px] font-semibold ${className}`}
    >
      <CheckCircle2 size={11} className="print:w-2.5 print:h-2.5" />
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

/**
 * Format Cash Denomination Breakdown from payment_details or note
 * Example output: Cash Breakdown: ₹500x2, ₹100x1 (Total Given: ₹1100 | Change Returned: ₹100)
 */
export function formatCashBreakdown(payment?: Payment | null): {
  breakdown: string;
  hasBreakdown: boolean;
  cleanNote: string;
} {
  if (!payment) return { breakdown: "", hasBreakdown: false, cleanNote: "" };

  let details: any = payment.payment_details;
  if (typeof details === "string") {
    try {
      details = JSON.parse(details);
    } catch {
      details = null;
    }
  }

  const noteDenominations = [500, 200, 100, 50, 20, 10];
  const coinDenominations = [20, 10, 5, 2, 1];

  const breakdownParts: string[] = [];
  let totalGiven = 0;
  let returnChange = 0;

  if (details && typeof details === "object") {
    // 1. Check notes (500, 200, 100, 50, 20, 10)
    for (const note of noteDenominations) {
      const qty = Number(
        details[String(note)] ??
        details.notes?.[String(note)] ??
        details.notes?.[note] ??
        0
      );
      if (qty > 0) {
        breakdownParts.push(`₹${note}x${qty}`);
      }
    }

    // 2. Check coins (20, 10, 5, 2, 1)
    for (const coin of coinDenominations) {
      const qty = Number(
        details[`coin_${coin}`] ??
        details.coins?.[String(coin)] ??
        details.coins?.[coin] ??
        (coin <= 5 ? details[String(coin)] : 0) ??
        0
      );
      if (qty > 0) {
        breakdownParts.push(`₹${coin}x${qty}`);
      }
    }

    totalGiven = Number(details.total_received ?? details.totalReceived ?? 0);
    returnChange = Number(details.return_change ?? details.change_to_return ?? details.changeToReturn ?? 0);
  }

  // Strip generic "[Cash Recd: ₹..., Change Ret: ₹...]" from the existing note
  let cleanNote = (payment.note || "").replace(/\[Cash Recd:[^\]]+\]/gi, "").trim();

  if (breakdownParts.length > 0) {
    let breakdown = `Cash Breakdown: ${breakdownParts.join(", ")}`;
    if (totalGiven > 0) {
      breakdown += ` (Total Given: ₹${totalGiven} | Change Returned: ₹${returnChange})`;
    }
    return { breakdown, hasBreakdown: true, cleanNote };
  }

  // Fallback: If payment mode was cash and note contains "[Cash Recd: ..., Change Ret: ...]"
  const cashRecdMatch = (payment.note || "").match(
    /\[Cash Recd:\s*₹?([0-9,.]+),\s*Change Ret:\s*₹?([0-9,.]+)\]/i
  );
  if (
    (payment.payment_mode?.toLowerCase() === "cash" || payment.payment_mode === "cash") &&
    cashRecdMatch
  ) {
    const recd = cashRecdMatch[1].replace(/,/g, "");
    const ret = cashRecdMatch[2].replace(/,/g, "");
    const breakdown = `Cash Breakdown: (Total Given: ₹${recd} | Change Returned: ₹${ret})`;
    return { breakdown, hasBreakdown: true, cleanNote };
  }

  return { breakdown: "", hasBreakdown: false, cleanNote };
}
