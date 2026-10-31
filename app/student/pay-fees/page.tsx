"use client";

import { StudentEmptyState } from "@/components/student/student-empty-state";
import { MobileSelectDrawer, MobileSelectTrigger } from "@/components/ui/mobile-select-drawer";
import { toast } from "sonner";
import { downloadResultPreviewPDF } from "@/lib/result-dom-pdf";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Wallet,
  CreditCard,
  Clock,
  IndianRupee,
  Search,
  Download,
  RefreshCw,
  MoreVertical,
  CheckCircle2,
  Info,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Loader2,
  X,
} from "lucide-react";
import {
  getMyFees,
  getPaymentHistory,
  computeFeeSummary,
  formatINR,
  billingPeriodToLabel,
  feeStatusLabel,
  initiateRazorpayPayment,
  type MyStudentFee,
  type Payment,
  type FeeStatus,
  type PaymentMode,
} from "@/lib/student";

const statusStyles: Record<FeeStatus, string> = {
  pending: "bg-orange-100 text-orange-600 border border-orange-300",
  partial: "bg-blue-100 text-blue-600 border border-blue-300",
  paid: "bg-green-100 text-green-600 border border-green-300",
  cancelled: "bg-gray-100 text-gray-500 border border-gray-300",
};

const StatusBadge = ({ status }: { status: FeeStatus }) => (
  <span
    className={`text-xs font-semibold px-3 py-1 rounded-full ${statusStyles[status]}`}
  >
    {feeStatusLabel(status)}
  </span>
);

// ─── Payment Mode Icon ────────────────────────────────────────────────────────

const modeEmoji: Record<PaymentMode, string> = {
  upi: "📱",
  cash: "💵",
  online: "💳",
  cheque: "🧾",
  bank_transfer: "🏦",
  govt_rte: "🏛️",
};

const PaymentModeIcon = ({ mode }: { mode: PaymentMode }) => (
  <span className="inline-flex items-center gap-1">
    <span>{modeEmoji[mode] ?? "💳"}</span>
    <span className="text-gray-700 text-sm capitalize">
      {mode.replace("_", " ")}
    </span>
  </span>
);

// ─── Partial Pay Modal ────────────────────────────────────────────────────────

function PartialPayModal({
  fee,
  onClose,
  onPaid,
}: {
  fee: MyStudentFee;
  onClose: () => void;
  onPaid: () => void;
}) {
  const [amount, setAmount] = useState<string>(String(fee.balance_amount ?? 0));
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  const maxAmount = Number(fee.balance_amount ?? 0);

  const handlePay = async () => {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0 || val > maxAmount) {
      setError(`Enter a valid amount between ₹1 and ₹${maxAmount}`);
      return;
    }
    setPaying(true);
    setError("");
    await initiateRazorpayPayment({
      studentFeeId: fee.id,
      partialAmount: val < maxAmount ? val.toFixed(2) : undefined,
      onSuccess: () => {
        setPaying(false);
        onPaid();
        onClose();
      },
      onFailure: (msg) => {
        setPaying(false);
        setError(msg);
      },
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex sm:items-center sm:justify-center p-0 sm:p-4 overflow-hidden" onClick={onClose}>
      <div className="bg-white w-full h-[100dvh] sm:h-auto sm:max-h-[90vh] sm:max-w-md sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-gray-900">Pay Fees</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {billingPeriodToLabel(fee.billing_period)} — Balance:{" "}
              <span className="font-semibold text-gray-800">
                {formatINR(fee.balance_amount)}
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
              Amount to Pay
            </label>
            <input
              type="text"
              value={amount}
              readOnly
              className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-base font-black bg-gray-50 text-slate-900 cursor-not-allowed focus:outline-none mb-1 shadow-2xs"
            />
            <div className="flex gap-2 mt-1">
              <button
                type="button"
                onClick={() => setAmount(String(fee.balance_amount ?? 0))}
                className="text-xs text-blue-600 hover:underline font-bold cursor-pointer"
              >
                Pay full balance
              </button>
            </div>
          </div>

          {error && (
            <p className="text-xs text-rose-600 flex items-center gap-1.5 p-3 bg-rose-50 rounded-2xl border border-rose-200 font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </p>
          )}
        </div>

        {/* Fixed Bottom Single-Row Full-Width Buttons */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-white shrink-0 flex items-center gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-2xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 active:scale-98 transition-all text-center flex items-center justify-center cursor-pointer shadow-2xs"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handlePay}
            disabled={paying}
            className="flex-1 py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-bold shadow-md shadow-blue-500/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {paying ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {paying ? "Processing…" : "Pay Now"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Receipt Modal ────────────────────────────────────────────────────────────

function ReceiptModal({
  fee,
  onClose,
}: {
  fee: MyStudentFee;
  onClose: () => void;
}) {
  const fmt = (d: string) =>
    d
      ? new Date(d).toLocaleString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "N/A";

  const handleDownload = async () => {
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");

    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    const left = 14;

    const fmt = (d: string) =>
      d
        ? new Date(d).toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "N/A";

    // ── Header ──
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("SCHOOL FEE RECEIPT", pageW / 2, 18, { align: "center" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Official Payment Receipt", pageW / 2, 25, { align: "center" });

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(left, 29, pageW - left, 29);

    // ── PAID stamp ──
    doc.setDrawColor(0);
    doc.rect(pageW - 50, 32, 36, 10);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("PAID", pageW - 32, 39, { align: "center" });

    // ── Student Info rows ──
    doc.setFontSize(9);
    let y = 34;
    const col2 = 58;

    const infoRow = (label: string, value: string) => {
      doc.setFont("helvetica", "bold");
      doc.text(label, left, y);
      doc.setFont("helvetica", "normal");
      doc.text(`: ${value}`, col2, y);
      y += 6;
    };

    infoRow("Student Name", (fee as any).student_name ?? "N/A");
    infoRow("Class", (fee as any).school_class_name ?? "N/A");
    infoRow("Fee Type", (fee as any).feetype_name ?? "N/A");
    infoRow("Billing Period", billingPeriodToLabel(fee.billing_period));
    infoRow("Due Date", (fee as any).due_date ?? "N/A");
    infoRow("Receipt ID", String((fee as any).id ?? "N/A"));
    infoRow("Academic Year", String((fee as any).academic_year ?? "N/A"));

    y += 4;
    doc.setLineWidth(0.3);
    doc.line(left, y, pageW - left, y);
    y += 6;

    // ── Fee Breakdown Table ──
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("FEE BREAKDOWN", pageW / 2, y, { align: "center" });
    y += 4;

    autoTable(doc, {
      startY: y,
      head: [["Description", "Amount"]],
      body: [
        ["Fee Amount", `Rs. ${Number(fee.amount).toFixed(2)}`],
        ["Discount", `-Rs. ${Number(fee.discount_amount).toFixed(2)}`],
        ["Fine Amount", `+Rs. ${Number(fee.fine_amount).toFixed(2)}`],
        [
          "Late Fee Amount",
          `Rs. ${Number((fee as any).late_fee_amount ?? 0).toFixed(2)}`,
        ],
        [
          "Max Late Fee",
          `Rs. ${Number((fee as any).max_late_fee ?? 0).toFixed(2)}`,
        ],
        [
          "Payable Amount",
          `Rs. ${Number(fee.actual_payable_amount).toFixed(2)}`,
        ],
        ["Paid Amount", `Rs. ${Number(fee.paid_amount).toFixed(2)}`],
        ["Balance", `Rs. ${Number(fee.balance_amount).toFixed(2)}`],
      ],
      styles: {
        fontSize: 9,
        textColor: [0, 0, 0] as any,
        fillColor: [255, 255, 255] as any,
      },
      headStyles: {
        fillColor: [255, 255, 255] as any,
        textColor: [0, 0, 0] as any,
        fontStyle: "bold",
        lineWidth: 0.3,
        lineColor: [0, 0, 0] as any,
      },
      bodyStyles: {
        lineWidth: 0.2,
        lineColor: [0, 0, 0] as any,
      },
      columnStyles: {
        0: { cellWidth: 100 },
        1: { halign: "right" },
      },
      theme: "grid",
    });

    y = (doc as any).lastAutoTable.finalY + 8;

    // ── Payment Details Table ──
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("PAYMENT DETAILS", pageW / 2, y, { align: "center" });
    y += 4;

    autoTable(doc, {
      startY: y,
      body: [
        ["Payment Mode", (fee as any).payment_mode ?? "N/A"],
        ["Transaction ID", (fee as any).transaction_id ?? "N/A"],
        ["Paid At", fmt((fee as any).paid_at)],
        ["Created At", fmt((fee as any).created_at)],
        ["Late Fee Enabled", (fee as any).late_fee_enabled ? "Yes" : "No"],
        ["Late Fee Type", (fee as any).late_fee_type ?? "N/A"],
        ["Grace Days", String((fee as any).grace_days ?? "N/A")],
        ["School ID", String((fee as any).school ?? "N/A")],
        ["Student ID", String((fee as any).student ?? "N/A")],
        ["Fee ID", String((fee as any).id ?? "N/A")],
      ],
      styles: {
        fontSize: 9,
        textColor: [0, 0, 0] as any,
        fillColor: [255, 255, 255] as any,
      },
      bodyStyles: {
        lineWidth: 0.2,
        lineColor: [0, 0, 0] as any,
      },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 60 },
      },
      theme: "grid",
    });

    y = (doc as any).lastAutoTable.finalY + 16;

    // ── Signatures ──
    doc.setFontSize(9);
    doc.setLineWidth(0.3);
    doc.line(left, y, left + 60, y);
    doc.line(pageW - left - 60, y, pageW - left, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.text("Parent / Guardian Signature", left, y);
    doc.text("Authorized Signature", pageW - left - 60, y);

    doc.save(
      `receipt-${(fee as any).feetype_name ?? fee.id}-${fee.billing_period}.pdf`,
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex sm:items-center sm:justify-center p-0 sm:p-4 overflow-hidden" onClick={onClose}>
      <div className="bg-white w-full h-[100dvh] sm:h-auto sm:max-h-[90vh] sm:max-w-md sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-gray-900">Payment Receipt</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full">
              PAID
            </span>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 no-scrollbar">
          {/* Student & Fee Info */}
          <div className="bg-gray-50 rounded-2xl p-4 space-y-2 border border-slate-100">
            <div className="flex justify-between text-xs sm:text-sm">
              <span className="text-gray-500">Student</span>
              <span className="font-semibold text-gray-800">
                {(fee as any).student_name}
              </span>
            </div>
            <div className="flex justify-between text-xs sm:text-sm">
              <span className="text-gray-500">Class</span>
              <span className="font-semibold text-gray-800">
                {(fee as any).school_class_name}
              </span>
            </div>
            <div className="flex justify-between text-xs sm:text-sm">
              <span className="text-gray-500">Fee Type</span>
              <span className="font-semibold text-gray-800">
                {(fee as any).feetype_name}
              </span>
            </div>
            <div className="flex justify-between text-xs sm:text-sm">
              <span className="text-gray-500">Period</span>
              <span className="font-semibold text-gray-800">
                {billingPeriodToLabel(fee.billing_period)}
              </span>
            </div>
          </div>

          {/* Amount Breakdown */}
          <div className="border border-gray-100 rounded-2xl p-4 space-y-2 bg-white shadow-2xs">
            <div className="flex justify-between text-xs sm:text-sm">
              <span className="text-gray-500">Amount</span>
              <span className="font-semibold text-gray-800">
                {formatINR(fee.amount)}
              </span>
            </div>
            <div className="flex justify-between text-xs sm:text-sm">
              <span className="text-gray-500">Discount</span>
              <span className="font-semibold text-gray-800">
                {formatINR(fee.discount_amount)}
              </span>
            </div>
            <div className="flex justify-between text-xs sm:text-sm">
              <span className="text-gray-500">Fine</span>
              <span className="font-semibold text-red-600">
                +{formatINR(fee.fine_amount)}
              </span>
            </div>
            <div className="border-t border-gray-100 pt-2 flex justify-between text-xs sm:text-sm font-bold">
              <span className="text-gray-800">Total Paid</span>
              <span className="text-green-700">
                {formatINR(fee.paid_amount)}
              </span>
            </div>
            <div className="flex justify-between text-xs sm:text-sm">
              <span className="text-gray-500">Balance</span>
              <span className="font-bold text-gray-800">
                {formatINR(fee.balance_amount)}
              </span>
            </div>
          </div>

          {/* Payment Details */}
          <div className="bg-gray-50 rounded-2xl p-4 space-y-2 text-xs border border-slate-100">
            <div className="flex justify-between">
              <span className="text-gray-500">Paid Date</span>
              <span className="font-semibold text-gray-800">
                {fmt((fee as any).paid_date)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Payment Mode</span>
              <span className="font-semibold text-gray-800 capitalize">
                {(fee as any).payment_mode ?? "Online"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Due Date</span>
              <span className="font-semibold text-gray-800">
                {(fee as any).due_date ?? "N/A"}
              </span>
            </div>
          </div>
        </div>

        {/* Fixed Bottom Single-Row Full-Width Buttons */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-white shrink-0 flex items-center gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-2xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 active:scale-98 transition-all text-center flex items-center justify-center cursor-pointer shadow-2xs"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="flex-1 py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Download Receipt
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function PaymentHistoryReceiptPreview({ payment, payments, onClose }: { payment: Payment; payments: Payment[]; onClose: () => void }) {
  const cardRef = useRef<HTMLElement>(null);
  const [downloading, setDownloading] = useState(false);
  const receiptItems = payment.receipt_number
    ? payments.filter((item) => item.receipt_number === payment.receipt_number)
    : [payment];
  const receiptNumber = payment.receipt_number || `PAY-${payment.id}`;
  const paidAt = payment.payment_date || payment.date || payment.created_at || "";
  const dateLabel = paidAt ? new Date(paidAt).toLocaleString("en-IN", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
  const totalPaid = receiptItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const downloadReceipt = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      await downloadResultPreviewPDF(cardRef.current, `receipt-${receiptNumber.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`);
    } catch (error) {
      console.error("Unable to download payment receipt", error);
      toast.error("Could not download this payment receipt. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  return <div className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/60 backdrop-blur-sm sm:items-center sm:p-4">
    <section className="flex h-[96dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:h-[92dvh] sm:max-w-4xl sm:rounded-3xl">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-6">
        <div><h2 className="text-base font-bold text-slate-900 sm:text-lg">Payment Receipt</h2><p className="text-xs text-slate-500">Receipt {receiptNumber}</p></div>
        <button type="button" onClick={onClose} aria-label="Close receipt preview" className="rounded-full p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
      </header>
      <div className="min-h-0 flex-1 overflow-auto bg-slate-100 p-3 sm:p-6">
        <article ref={cardRef} className="mx-auto flex min-h-[900px] w-full max-w-[740px] flex-col border border-slate-200 bg-white p-5 text-slate-900 shadow-sm sm:min-h-[1000px] sm:p-8" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
          <header className="flex items-center gap-4 border-b-[3px] border-blue-800 pb-5">
            {payment.school_logo ? <img src={payment.school_logo} alt="School logo" className="h-16 w-16 shrink-0 object-contain sm:h-24 sm:w-24" /> : <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-blue-50 text-2xl font-bold text-blue-800 sm:h-24 sm:w-24">{(payment.school_name || "S").charAt(0)}</div>}
            <div className="min-w-0 flex-1 text-center"><h1 className="break-words text-lg font-black uppercase text-blue-950 sm:text-2xl">{payment.school_name || "School"}</h1>{payment.school_address && <p className="mt-1 text-xs text-slate-600 sm:text-sm">{payment.school_address}</p>}{payment.school_phone && <p className="text-xs text-slate-600">{payment.school_phone}</p>}</div>
            <div className="shrink-0 rounded-lg border border-blue-200 bg-blue-50 px-2 py-2 text-center text-blue-900 sm:px-4"><span className="block text-[10px] uppercase tracking-wide">Payment Status</span><strong className={`mt-1 block text-xs sm:text-sm ${payment.is_verified ? "text-emerald-700" : "text-amber-700"}`}>{payment.is_verified ? "VERIFIED" : "PENDING"}</strong></div>
          </header>

          <div className="my-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-4 text-center sm:my-7"><h2 className="text-lg font-black uppercase tracking-wide text-blue-950 sm:text-2xl">Fee Payment Receipt</h2><p className="mt-1 text-xs font-bold uppercase tracking-[0.28em] text-blue-800">Official Payment Record</p></div>

          <section className="grid grid-cols-2 gap-x-4 gap-y-4 rounded-xl border border-slate-200 p-4 sm:gap-x-8 sm:p-6">
            {[["Student Name", payment.student_name], ["GR Number", payment.student_gr_no], ["Class / Division", [payment.student_class, payment.student_division].filter(Boolean).join(" / ")], ["Academic Year", payment.academic_year_name], ["Receipt Number", receiptNumber], ["Payment Date", dateLabel]].map(([label, value]) => <div key={label}><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:text-xs">{label}</p><p className="mt-1 break-words text-xs font-bold text-slate-900 sm:text-sm">{value || "—"}</p></div>)}
          </section>

          <section className="my-5 overflow-hidden rounded-xl border border-slate-200 sm:my-7"><table className="w-full border-collapse"><thead><tr className="bg-blue-950 text-white"><th className="px-3 py-3 text-left text-xs sm:px-4 sm:text-sm">Fee Description</th><th className="px-3 py-3 text-left text-xs sm:px-4 sm:text-sm">Billing Period</th><th className="px-3 py-3 text-right text-xs sm:px-4 sm:text-sm">Amount</th></tr></thead><tbody>{receiptItems.map((item) => <tr key={item.id} className="border-t border-slate-100"><td className="px-3 py-3 text-xs sm:px-4 sm:text-sm">{item.feetype_name || item.fee_description || "School Fee"}</td><td className="px-3 py-3 text-xs sm:px-4 sm:text-sm">{item.fee_billing_period || "—"}</td><td className="px-3 py-3 text-right text-xs font-semibold sm:px-4 sm:text-sm">{formatINR(item.amount)}</td></tr>)}</tbody></table></section>

          <section className="grid grid-cols-2 gap-3 sm:gap-4"><div className="rounded-xl border border-blue-200 bg-blue-50 p-4"><span className="text-[10px] font-bold uppercase text-blue-700 sm:text-xs">Payment Mode</span><strong className="mt-1 block text-sm uppercase text-blue-950 sm:text-lg">{String(payment.payment_mode || "—").replaceAll("_", " ")}</strong></div><div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><span className="text-[10px] font-bold uppercase text-emerald-700 sm:text-xs">Total Paid</span><strong className="mt-1 block text-sm text-emerald-900 sm:text-lg">{formatINR(totalPaid)}</strong></div></section>
          <section className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-bold text-slate-800 sm:text-sm">Transaction Details</p><p className="mt-2 break-all text-xs text-slate-600">Transaction ID: {payment.transaction_id || payment.razorpay_payment_id || "—"}</p><p className="mt-1 text-xs text-slate-600">Note: {payment.note || "—"}</p></section>
          <footer className="mt-auto grid grid-cols-2 gap-8 px-3 pb-8 pt-16 text-center text-xs font-bold text-slate-700"><div className="border-t border-slate-500 pt-2">Parent / Guardian</div><div className="border-t border-slate-500 pt-2">Authorized Signatory</div></footer>
          <p className="border-t border-slate-200 pt-3 text-center text-[10px] text-slate-500">This is a computer generated receipt. Please retain it for your records.</p>
        </article>
      </div>
      <footer className="flex shrink-0 justify-end gap-2 border-t border-slate-200 bg-white p-3 sm:px-6"><button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Close</button><button type="button" onClick={downloadReceipt} disabled={downloading} className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}{downloading ? "Preparing PDF…" : "Download PDF"}</button></footer>
    </section>
  </div>;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const PAGE_SIZE = 5;

export default function PayFeesPage() {
  // ── State ──
  const [fees, setFees] = useState<MyStudentFee[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [selectedMonth, setSelectedMonth] = useState("All Months");
  const [selectedStatus, setSelectedStatus] = useState("All Status");
  const [searchFees, setSearchFees] = useState("");
  const [mobileFilterDrawer, setMobileFilterDrawer] = useState<"month" | "status" | null>(null);

  // Pay modal
  const [payingFee, setPayingFee] = useState<MyStudentFee | null>(null);
  const [receiptFee, setReceiptFee] = useState<MyStudentFee | null>(null);
  const [historyReceipt, setHistoryReceipt] = useState<Payment | null>(null);

  // History pagination
  const [historyPage, setHistoryPage] = useState(1);

  // ── Preload Razorpay script on mount ──
  // ── Data Fetch ──
  const fetchFees = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError("");
    try {
      const data = await getMyFees();
      setFees(data);
    } catch (e) {
      setError((e as Error).message ?? "Failed to load fees");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const data = await getPaymentHistory();
      setPaymentHistory(data);
    } catch {
      // non-critical; silently fail
    } finally {
      setHistoryLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchFees();
    fetchHistory();
  }, [fetchFees, fetchHistory]);

  // ── Derived Summary ──
  const summary = computeFeeSummary(fees);

  const summaryCards = [
    {
      title: "Total Fees",
      amount: formatINR(summary.totalFees),
      description: "Total amount to be paid",
      icon: Wallet,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      border: "border-blue-100",
    },
    {
      title: "Paid Amount",
      amount: formatINR(summary.paidAmount),
      description: "Total amount paid",
      icon: CreditCard,
      iconBg: "bg-orange-100",
      iconColor: "text-orange-500",
      border: "border-orange-100",
    },
    {
      title: "Pending Amount",
      amount: formatINR(summary.pendingAmount),
      description: "Total pending amount",
      icon: Clock,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-500",
      border: "border-blue-100",
    },
    {
      title: "Remaining Balance",
      amount: formatINR(summary.remainingBalance),
      description: "Remaining to be paid",
      icon: IndianRupee,
      iconBg: "bg-green-100",
      iconColor: "text-green-500",
      border: "border-green-100",
    },
  ];

  // ── Client-side Filtering ──
  const filteredFees = fees.filter((fee) => {
    const label = billingPeriodToLabel(fee.billing_period);
    const monthMatch =
      selectedMonth === "All Months" || label.startsWith(selectedMonth);
    const statusMatch =
      selectedStatus === "All Status" ||
      String(fee.status).toLowerCase() === selectedStatus.toLowerCase();
    const searchMatch =
      !searchFees ||
      label.toLowerCase().includes(searchFees.toLowerCase()) ||
      String(fee.status).toLowerCase().includes(searchFees.toLowerCase());
    return monthMatch && statusMatch && searchMatch;
  });

  // ── History Pagination ──
  const totalPages = Math.max(1, Math.ceil(paymentHistory.length / PAGE_SIZE));
  const pagedHistory = paymentHistory.slice(
    (historyPage - 1) * PAGE_SIZE,
    historyPage * PAGE_SIZE,
  );

  // ── Export ──
  const handleExport = () => {
    const rows = [
      [
        "Period",
        "Status",
        "Amount",
        "Discount",
        "Fine",
        "Payable",
        "Paid",
        "Balance",
      ],
      ...filteredFees.map((f) => [
        billingPeriodToLabel(f.billing_period),
        f.status,
        f.amount,
        f.discount_amount,
        f.fine_amount,
        f.actual_payable_amount,
        f.paid_amount,
        f.balance_amount,
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "my-fees.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadHistoryReceipt = async (payment: Payment) => {
    try {
      const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);
      const relatedPayments = payment.receipt_number
        ? paymentHistory.filter((item) => item.receipt_number === payment.receipt_number)
        : [payment];
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 16;
      const paidAt = payment.payment_date || payment.date || payment.created_at || "";
      const dateLabel = paidAt
        ? new Date(paidAt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
        : "—";
      const receiptNumber = payment.receipt_number || `PAY-${payment.id}`;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(25, 59, 115);
      doc.text(payment.school_name || "School Fee Receipt", pageWidth / 2, 19, { align: "center" });
      doc.setFontSize(12);
      doc.text("PAYMENT RECEIPT", pageWidth / 2, 28, { align: "center" });
      doc.setDrawColor(37, 99, 235);
      doc.setLineWidth(0.6);
      doc.line(margin, 33, pageWidth - margin, 33);

      doc.setFontSize(10);
      doc.setTextColor(35, 48, 70);
      const leftInfo = [
        ["Receipt No.", receiptNumber],
        ["Student", payment.student_name || "—"],
        ["GR No.", payment.student_gr_no || "—"],
        ["Class", [payment.student_class, payment.student_division].filter(Boolean).join(" / ") || "—"],
      ];
      const rightInfo = [
        ["Payment Date", dateLabel],
        ["Payment Mode", String(payment.payment_mode || "—").replaceAll("_", " ").toUpperCase()],
        ["Transaction ID", payment.transaction_id || payment.razorpay_payment_id || "—"],
        ["Status", payment.is_verified ? "VERIFIED" : "PENDING VERIFICATION"],
      ];
      leftInfo.forEach(([label, value], index) => {
        const y = 43 + index * 8;
        doc.setFont("helvetica", "bold"); doc.text(`${label}:`, margin, y);
        doc.setFont("helvetica", "normal"); doc.text(String(value), margin + 28, y, { maxWidth: 56 });
      });
      rightInfo.forEach(([label, value], index) => {
        const y = 43 + index * 8;
        doc.setFont("helvetica", "bold"); doc.text(`${label}:`, 108, y);
        doc.setFont("helvetica", "normal"); doc.text(String(value), 140, y, { maxWidth: 54 });
      });

      autoTable(doc, {
        startY: 80,
        head: [["Fee Description", "Billing Period", "Amount"]],
        body: relatedPayments.map((item) => [
          item.feetype_name || item.fee_description || "School Fee",
          item.fee_billing_period || "—",
          formatINR(item.amount),
        ]),
        foot: [["Total Paid", "", formatINR(relatedPayments.reduce((sum, item) => sum + Number(item.amount || 0), 0))]],
        theme: "grid",
        headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: "bold" },
        footStyles: { fillColor: [239, 246, 255], textColor: [25, 59, 115], fontStyle: "bold" },
        styles: { fontSize: 9, cellPadding: 3 },
      });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text("Thank you for your payment.", pageWidth / 2, (doc as any).lastAutoTable.finalY + 12, { align: "center" });
      doc.save(`receipt-${receiptNumber.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`);
    } catch (error) {
      console.error("Unable to download payment receipt", error);
      toast.error("Could not download this payment receipt. Please try again.");
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto w-full min-w-0 overflow-x-hidden pb-32 sm:pb-8">
      {/* Error Banner */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
          <button
            onClick={() => fetchFees()}
            className="ml-auto underline text-xs"
          >
            Retry
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 mb-4 sm:mb-6">
        {summaryCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={index}
              className={`bg-white rounded-2xl border ${card.border} p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3 shadow-sm min-w-0`}
            >
              <div
                className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shrink-0 ${card.iconBg}`}
              >
                <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${card.iconColor}`} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] sm:text-sm text-gray-500 mb-0.5 sm:mb-1 truncate">{card.title}</p>
                {loading ? (
                  <div className="h-7 sm:h-8 w-24 sm:w-28 bg-gray-100 animate-pulse rounded-lg" />
                ) : (
                  <p className="text-base sm:text-2xl font-bold text-gray-900 truncate">
                    {card.amount}
                  </p>
                )}
                <p className="hidden sm:block text-xs text-gray-400 mt-1">{card.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 p-3 sm:p-4 mb-4 sm:mb-6 grid grid-cols-2 sm:flex gap-2 sm:gap-3 items-center shadow-sm">
        <MobileSelectTrigger
          valueLabel={selectedMonth}
          onClick={() => setMobileFilterDrawer("month")}
          className="w-full md:hidden"
        />
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="hidden md:block min-w-0 border border-gray-200 rounded-xl px-3 py-2 sm:px-4 text-xs sm:text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
        >
          <option>All Months</option>
          {MONTHS.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>

        <MobileSelectTrigger
          valueLabel={selectedStatus}
          onClick={() => setMobileFilterDrawer("status")}
          className="w-full md:hidden"
        />
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="hidden md:block min-w-0 border border-gray-200 rounded-xl px-3 py-2 sm:px-4 text-xs sm:text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
        >
          <option>All Status</option>
          <option>Paid</option>
          <option>Pending</option>
          <option>Partial</option>
          <option>Cancelled</option>
        </select>

        <div className="col-span-2 sm:flex-1 relative min-w-0">
          <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <input
            type="text"
            placeholder="Search fees..."
            value={searchFees}
            onChange={(e) => setSearchFees(e.target.value)}
            className="w-full pl-8 sm:pl-9 pr-3 sm:pr-4 py-2 border border-gray-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>

        <button
          onClick={handleExport}
          className="col-span-2 sm:ml-auto flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors w-full sm:w-auto"
        >
          <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          Export
        </button>
      </div>

      {/* My Fees Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">My Fees</h2>
          <button
            onClick={() => fetchFees(true)}
            disabled={refreshing}
            className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium disabled:opacity-50"
          >
            <RefreshCw
              className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm h-32 animate-pulse"
              />
            ))}
          </div>
        ) : filteredFees.length === 0 ? (
          <StudentEmptyState
            title="No fee records found"
            description="There are no pending or assessed fee dues matching the selected filters."
          />
        ) : (
          <div className="flex flex-col gap-4">
            {filteredFees.map((fee) => (
              <div
                key={fee.id}
                className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm"
              >
                <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                  {/* Left: Icon + Title */}
                  <div className="flex items-start gap-3 w-full lg:w-auto min-w-0">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <svg
                        className="w-6 h-6 text-blue-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <rect
                          x="3"
                          y="4"
                          width="18"
                          height="18"
                          rx="2"
                          strokeWidth={2}
                          fill="none"
                        />
                        <line
                          x1="16"
                          y1="2"
                          x2="16"
                          y2="6"
                          strokeWidth={2}
                          strokeLinecap="round"
                        />
                        <line
                          x1="8"
                          y1="2"
                          x2="8"
                          y2="6"
                          strokeWidth={2}
                          strokeLinecap="round"
                        />
                        <line x1="3" y1="10" x2="21" y2="10" strokeWidth={2} />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-gray-900 text-base truncate">
                        {billingPeriodToLabel(fee.billing_period)} Fee
                      </p>
                      <p className="text-sm text-gray-400 mb-2 truncate">
                        {billingPeriodToLabel(fee.billing_period)}
                      </p>
                      <StatusBadge status={fee.status as FeeStatus} />
                    </div>
                  </div>

                  {/* Middle: Fee Details */}
                  <div className="w-full lg:flex-1 grid grid-cols-2 sm:grid-cols-3 gap-x-4 sm:gap-x-6 gap-y-3 min-w-0">
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Amount</p>
                      <p className="text-sm font-semibold text-gray-800">
                        {formatINR(fee.amount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Discount</p>
                      <p className="text-sm font-semibold text-red-500">
                        -{formatINR(fee.discount_amount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Fine</p>
                      <p className="text-sm font-semibold text-green-600">
                        +{formatINR(fee.fine_amount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">
                        Payable Amount
                      </p>
                      <p className="text-sm font-semibold text-gray-800">
                        {formatINR(fee.actual_payable_amount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Paid Amount</p>
                      <p className="text-sm font-semibold text-gray-800">
                        {formatINR(fee.paid_amount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">
                        Balance Amount
                      </p>
                      <p className="text-sm font-semibold text-gray-800">
                        {formatINR(fee.balance_amount)}
                      </p>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex flex-row lg:flex-col items-center lg:items-end gap-2 w-full lg:w-auto min-w-0 lg:min-w-[130px] pt-2 lg:pt-0 border-t lg:border-t-0 border-gray-100">
                    <button className="text-gray-400 hover:text-gray-600 hidden lg:block self-end">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                    {String(fee.status).toLowerCase() === "paid" ? (
                      <div className="flex-1 lg:w-full bg-green-100 text-green-700 border border-green-200 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-center flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>Paid</span>
                      </div>
                    ) : String(fee.status).toLowerCase() === "cancelled" ? (
                      <div className="flex-1 lg:w-full text-gray-400 text-sm font-medium mt-1 text-center">
                        Cancelled
                      </div>
                    ) : (
                      <button
                        onClick={() => setPayingFee(fee)}
                        className="flex-1 lg:w-full bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors text-center"
                      >
                        Pay Now
                      </button>
                    )}
                    <button
                      onClick={() => setReceiptFee(fee)}
                      className="flex-1 lg:w-full flex items-center justify-center gap-1.5 sm:gap-2 border border-gray-200 hover:bg-gray-50 text-gray-700 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors"
                    >
                      <Download className="w-4 h-4 shrink-0" />
                      <span>Receipt</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-6 flex items-start gap-3 relative overflow-hidden">
        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
          <Info className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-sm text-gray-700 font-medium">
            You can pay full or partial amount of your pending fees.
          </p>
          <p className="text-sm text-gray-500">
            After payment, it may take a few minutes to update the status.
          </p>
        </div>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20">
          <div className="w-16 h-16 bg-blue-400 rounded-full" />
        </div>
      </div>

      {/* Payment History */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 mb-6 min-w-0">
        <div className="flex items-center justify-between mb-4 gap-2">
          <h2 className="text-xl font-bold text-gray-900">Payment History</h2>
          <button className="text-sm text-blue-600 hover:text-blue-700 border border-blue-200 px-4 py-1.5 rounded-lg font-medium">
            View All
          </button>
        </div>

        {historyLoading ? (
          <div className="h-32 animate-pulse bg-gray-50 rounded-xl" />
        ) : pagedHistory.length === 0 ? (
          <StudentEmptyState
            title="No payment history yet"
            description="Fee receipts and successful transactions will appear here once settled."
          />
        ) : (
          <>
          <div className="space-y-2 sm:hidden">
            {pagedHistory.map((payment, index) => {
              const paidAt = new Date(String((payment as any).date ?? payment.created_at ?? ""));
              return <article key={`${payment.receipt_number || "payment"}-${index}`} className="rounded-xl border border-slate-100 bg-white p-3">
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-slate-500">Date</p>
                    <p className="text-xs font-semibold text-slate-800">{paidAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
                    <p className="text-[10px] text-slate-400">{paidAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[11px] font-medium text-slate-500">Amount</p>
                    <p className="text-sm font-bold text-slate-900">{formatINR(payment.amount)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-2 pt-2">
                  <div className="min-w-0"><p className="text-[10px] text-slate-400">Payment Mode</p><div className="truncate"><PaymentModeIcon mode={(payment.payment_mode ?? "online") as PaymentMode} /></div></div>
                  <div className="min-w-0"><p className="text-[10px] text-slate-400">Receipt No.</p><p className="truncate text-xs font-medium text-slate-700">{payment.receipt_number || "—"}</p></div>
                  <div className="min-w-0"><p className="text-[10px] text-slate-400">Status</p><span className={`inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full ${payment.is_verified ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>{payment.is_verified ? "Verified" : "Pending"}</span></div>
                  <div className="col-span-2 pt-1">
                    <button type="button" onClick={() => setHistoryReceipt(payment)} className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700">
                      <Download className="h-3.5 w-3.5" /> View / Download Receipt
                    </button>
                  </div>
                </div>
              </article>;
            })}
          </div>
          <div className="hidden sm:block w-full min-w-0">
            <table className="w-full table-fixed text-xs sm:text-sm">
              <colgroup>
                <col className="w-[44%] sm:w-auto" />
                <col className="w-[25%] sm:w-auto" />
                <col className="w-[31%] sm:w-auto" />
                <col className="hidden sm:table-column" />
                <col className="hidden sm:table-column" />
                <col className="hidden sm:table-column" />
              </colgroup>
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-gray-500 font-medium py-2 sm:py-3 pr-1 sm:pr-4">
                    Date
                  </th>
                  <th className="text-left text-gray-500 font-medium py-2 sm:py-3 pr-1 sm:pr-4">
                    Amount
                  </th>
                  <th className="text-left text-gray-500 font-medium py-2 sm:py-3 pr-1 sm:pr-4">
                    Payment Mode
                  </th>
                  <th className="hidden sm:table-cell text-left text-gray-500 font-medium py-3 pr-4">
                    Receipt No.
                  </th>
                  <th className="hidden sm:table-cell text-left text-gray-500 font-medium py-3 pr-4">
                    Status
                  </th>
                  <th className="hidden sm:table-cell text-left text-gray-500 font-medium py-3">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {pagedHistory.map((payment, index) => (
                  <tr
                    key={index}
                    className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-2 sm:py-3 pr-1 sm:pr-4 text-gray-700 align-middle">
                      <span className="block truncate">{new Date(
                        String(
                          (payment as any).date ?? payment.created_at ?? "",
                        ),
                      ).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}</span>
                      <span className="hidden sm:block text-[11px] text-gray-400">{new Date(String((payment as any).date ?? payment.created_at ?? "")).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                    </td>
                    <td className="py-2 sm:py-3 pr-1 sm:pr-4 text-gray-800 font-medium whitespace-nowrap">
                      {formatINR(payment.amount)}
                    </td>
                    <td className="py-2 sm:py-3 pr-1 sm:pr-4 truncate">
                      <PaymentModeIcon
                        mode={(payment.payment_mode ?? "online") as PaymentMode}
                      />
                    </td>
                    <td className="hidden sm:table-cell py-3 pr-4 text-gray-700">
                      {payment.receipt_number}
                    </td>
                    <td className="hidden sm:table-cell py-3 pr-4">
                      <span
                        className={`text-xs font-semibold px-3 py-1 rounded-full ${
                          payment.is_verified
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {payment.is_verified ? "Verified" : "Pending"}
                      </span>
                    </td>
                    <td className="hidden sm:table-cell py-3">
                      <button type="button" aria-label="View payment receipt" onClick={() => setHistoryReceipt(payment)} className="text-gray-400 hover:text-blue-600 transition-colors">
                        <Download className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}

        {/* Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs sm:text-sm text-gray-400">
            Showing{" "}
            {Math.min((historyPage - 1) * PAGE_SIZE + 1, paymentHistory.length)}
            –{Math.min(historyPage * PAGE_SIZE, paymentHistory.length)} of{" "}
            {paymentHistory.length} records
          </p>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
              disabled={historyPage === 1}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setHistoryPage(p)}
                className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-semibold transition-colors ${
                  p === historyPage
                    ? "bg-blue-600 text-white"
                    : "border border-gray-200 text-gray-500 hover:bg-gray-50"
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setHistoryPage((p) => Math.min(totalPages, p + 1))}
              disabled={historyPage === totalPages}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* We Accept Section */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex flex-wrap items-center gap-6">
          <p className="text-sm font-semibold text-gray-600">We Accept</p>
          <div className="flex items-center gap-1">
            <span className="text-blue-600 font-bold text-lg tracking-tight">
              UPI
            </span>
            <span className="text-orange-500 font-bold text-sm">●</span>
          </div>
          <div className="bg-blue-700 text-white font-bold text-sm px-3 py-1 rounded italic">
            VISA
          </div>
          <div className="flex items-center gap-0.5">
            <div className="w-6 h-6 bg-red-500 rounded-full opacity-90" />
            <div className="w-6 h-6 bg-orange-400 rounded-full -ml-2 opacity-90" />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-blue-800 font-bold text-sm">Ru</span>
            <span className="text-orange-500 font-bold text-sm">Pay</span>
          </div>
          <div className="text-blue-500 font-bold text-sm">Paytm</div>
          <div className="bg-purple-700 text-white font-bold text-xs px-2 py-1 rounded">
            PhonePe
          </div>
          <div className="flex items-center gap-0.5">
            <span className="text-blue-500 font-bold text-sm">G</span>
            <span className="text-gray-700 font-bold text-sm">Pay</span>
          </div>
        </div>
      </div>

      <MobileSelectDrawer
        isOpen={mobileFilterDrawer !== null}
        onClose={() => setMobileFilterDrawer(null)}
        title={mobileFilterDrawer === "month" ? "Filter by month" : "Filter by status"}
        subtitle="Choose how to filter your fees"
        options={mobileFilterDrawer === "month"
          ? [{ label: "All Months", value: "All Months" }, ...MONTHS.map((month) => ({ label: month, value: month }))]
          : ["All Status", "Paid", "Pending", "Partial", "Cancelled"].map((status) => ({ label: status, value: status }))}
        selectedValue={mobileFilterDrawer === "month" ? selectedMonth : selectedStatus}
        onSelect={(value) => mobileFilterDrawer === "month" ? setSelectedMonth(String(value)) : setSelectedStatus(String(value))}
      />

      {/* Partial Pay Modal */}
      {payingFee && (
        <PartialPayModal
          fee={payingFee}
          onClose={() => setPayingFee(null)}
          onPaid={() => {
            fetchFees(true);
            fetchHistory();
          }}
        />
      )}

      {/* Receipt Modal */}
      {receiptFee && (
        <ReceiptModal fee={receiptFee} onClose={() => setReceiptFee(null)} />
      )}
      {historyReceipt && (
        <PaymentHistoryReceiptPreview
          payment={historyReceipt}
          payments={paymentHistory}
          onClose={() => setHistoryReceipt(null)}
        />
      )}
    </div>
  );
}

