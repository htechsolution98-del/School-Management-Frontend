"use client";

import React, { useState, useEffect } from "react";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { StudentFee } from "@/types/fees";
import { formatCurrency, formatBillingPeriod } from "@/lib/fees";
import CashDenominationCalculator, {
  CashDenominationState,
  INITIAL_CASH_STATE,
  calculateCashDetails,
} from "./cash-denomination-calculator";
import { DatePicker } from "@/components/ui/date-picker";

// Modal wrapper
function Modal({
  isOpen,
  onClose,
  title,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col border border-slate-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-sm">{title}</h3>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition"
          >
            ✕
          </button>
        </div>
        <div className="p-5 overflow-y-auto space-y-4">{children}</div>
      </div>
    </div>
  );
}

function FormField({
  label,
  error,
  required,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="text-[11px] text-red-500 mt-1">{error}</p>}
    </div>
  );
}

const inputClass =
  "w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium";

interface CollectFeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  fee: StudentFee | null;
  onSuccess: (receiptNumber?: string) => void;
}

export default function CollectFeeModal({
  isOpen,
  onClose,
  fee,
  onSuccess,
}: CollectFeeModalProps) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [payerType, setPayerType] = useState<"student" | "government">("student");

  const [form, setForm] = useState({
    amount: "",
    payment_mode: "cash",
    payment_date: new Date().toISOString().split("T")[0],
    transaction_id: "",
    receipt_number: "",
    note: "",
  });

  const [cashState, setCashState] = useState<CashDenominationState>(INITIAL_CASH_STATE);

  useEffect(() => {
    if (fee) {
      const studentBal = parseFloat(fee.balance_amount || "0");
      const govtBal = Math.max(
        0,
        parseFloat(fee.rte_govt_claim_amount || fee.amount || "0") -
          parseFloat(fee.rte_govt_paid_amount || "0")
      );
      const isGovtDefault = Boolean(
        fee.is_rte_govt_claim && studentBal <= 0 && govtBal > 0
      );
      const initialPayer = isGovtDefault ? "government" : "student";
      setPayerType(initialPayer);

      const defaultAmount =
        initialPayer === "government"
          ? govtBal.toFixed(2)
          : Math.max(0, studentBal).toFixed(2);

      setForm({
        amount: defaultAmount,
        payment_mode: initialPayer === "government" ? "govt_rte" : "cash",
        payment_date: new Date().toISOString().split("T")[0],
        transaction_id: "",
        receipt_number: "",
        note: initialPayer === "government" ? "RTE Government reimbursement payment" : "",
      });

      setCashState(INITIAL_CASH_STATE);
    }
  }, [fee]);

  const handlePayerChange = (newPayer: "student" | "government") => {
    setPayerType(newPayer);
    if (!fee) return;
    if (newPayer === "government") {
      const govtBal = Math.max(
        0,
        parseFloat(fee.rte_govt_claim_amount || fee.amount) -
          parseFloat(fee.rte_govt_paid_amount || "0")
      );
      setForm((prev) => ({
        ...prev,
        amount: govtBal.toFixed(2),
        payment_mode: "govt_rte",
        note: "RTE Government reimbursement payment",
      }));
    } else {
      const studentBal = Math.max(0, parseFloat(fee.balance_amount || "0"));
      setForm((prev) => ({
        ...prev,
        amount: studentBal.toFixed(2),
        payment_mode: "cash",
        note: "",
      }));
    }
    setCashState(INITIAL_CASH_STATE);
  };

  const currentBalance =
    payerType === "government"
      ? Math.max(
          0,
          parseFloat(fee?.rte_govt_claim_amount || fee?.amount || "0") -
            parseFloat(fee?.rte_govt_paid_amount || "0")
        )
      : Math.max(0, parseFloat(fee?.balance_amount || "0"));

  const isZeroBalance = !fee || currentBalance <= 0;

  const currentAmountNum = isZeroBalance ? 0 : (parseFloat(form.amount || "0") || 0);
  const cashCalculation = calculateCashDetails(cashState, currentAmountNum);

  // Form Validation: Disable "Collect Payment" submit button if Payment Mode is Cash AND Total Received is less than Amount to Collect
  const isCashMode = form.payment_mode === "cash";
  const isCashInsufficient =
    !isZeroBalance && isCashMode && currentAmountNum > 0 && cashCalculation.totalReceived < currentAmountNum;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fee || isZeroBalance) return;
    const errs: Record<string, string> = {};
    if (!form.amount || parseFloat(form.amount) <= 0) errs.amount = "Invalid amount";
    if (!form.payment_mode) errs.payment_mode = "Payment mode is required";
    if (!form.payment_date) errs.payment_date = "Payment date is required";

    if (
      ["cheque", "upi", "card", "govt_rte"].includes(form.payment_mode) &&
      !form.transaction_id &&
      form.payment_mode !== "govt_rte"
    ) {
      errs.transaction_id =
        form.payment_mode === "cheque"
          ? "Cheque No. is required"
          : "Reference No. is required";
    }

    if (isCashMode && currentAmountNum > 0 && cashCalculation.totalReceived < currentAmountNum) {
      errs.amount = `Total cash received (₹${cashCalculation.totalReceived.toLocaleString(
        "en-IN"
      )}) is less than amount to collect (₹${currentAmountNum.toLocaleString("en-IN")}).`;
    }

    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    try {
      const { collectStudentFeePayment } = await import("@/lib/fees/fee-generation");

      // Attach denomination breakdown when payment mode is Cash
      const payload: any = {
        student_fee: fee.id,
        payer_type: payerType,
        ...form,
      };

      if (isCashMode) {
        payload.payment_details = cashCalculation.payloadJson;
        // Append cash audit summary to note if not already present
        const cashNote = `[Cash Recd: ₹${cashCalculation.totalReceived.toLocaleString(
          "en-IN"
        )}, Change Ret: ₹${cashCalculation.changeToReturn.toLocaleString("en-IN")}]`;
        payload.note = form.note ? `${form.note} ${cashNote}` : cashNote;
      }

      const result = await collectStudentFeePayment(payload);

      if (result.success) {
        setToast({
          type: "success",
          message:
            payerType === "government"
              ? "Government RTE claim payment recorded!"
              : "Fee collected successfully!",
        });
        const receiptNo = result.data?.receipt_number;
        setTimeout(() => {
          onSuccess(receiptNo);
          onClose();
        }, 1200);
      } else {
        setToast({ type: "error", message: result.error || "Failed to collect fee" });
      }
    } catch (error: any) {
      setToast({ type: "error", message: error.message || "Failed to collect fee" });
    } finally {
      setLoading(false);
    }
  };

  const update = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        payerType === "government"
          ? "Record RTE Government Claim Payment"
          : "Collect Student Fee"
      }
    >
      {fee && (
        <div className="bg-blue-50 rounded-xl p-4 mb-4 border border-blue-100 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="font-semibold text-slate-900">{fee.student_name}</p>
              {fee.is_rte_govt_claim && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
                  🏛️ RTE Claim
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              {fee.class_name} • {formatBillingPeriod(fee.billing_period)}
            </p>
          </div>
          <div className="text-right">
            {payerType === "government" ? (
              <>
                <p className="text-xs text-indigo-600 font-semibold uppercase tracking-wider">
                  Govt Claim Receivable
                </p>
                <p className="text-lg font-bold text-indigo-700">
                  {formatCurrency(
                    (
                      parseFloat(fee.rte_govt_claim_amount || fee.amount) -
                      parseFloat(fee.rte_govt_paid_amount || "0")
                    ).toFixed(2)
                  )}
                </p>
                <p className="text-[10px] text-slate-500">
                  Status: {fee.rte_govt_status || "pending"}
                </p>
              </>
            ) : (
              <>
                <p className="text-xs text-slate-500 uppercase tracking-wider">Student Balance</p>
                <p className="text-lg font-bold text-red-600">
                  {formatCurrency(fee.balance_amount)}
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {fee?.is_rte_govt_claim && (
        <div className="flex rounded-lg bg-slate-100 p-1 mb-4">
          <button
            type="button"
            onClick={() => handlePayerChange("government")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${payerType === "government"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
              }`}
          >
            🏛️ Government RTE Claim
          </button>
          <button
            type="button"
            onClick={() => handlePayerChange("student")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${payerType === "student"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
              }`}
          >
            👤 Student / Guardian
          </button>
        </div>
      )}

      {isZeroBalance && (
        <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2.5 text-xs text-emerald-800 font-semibold animate-in fade-in duration-200">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <div>
            <p className="font-bold text-emerald-900">✅ This fee is already fully paid (Balance is ₹0.00).</p>
            <p className="text-[11px] font-normal text-emerald-700 mt-0.5">No outstanding dues remain for this record. Further payments are disabled.</p>
          </div>
        </div>
      )}

      {toast && (
        <div
          className={`mb-4 p-3 rounded-xl flex items-center gap-2 text-xs font-medium ${toast.type === "success"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-red-50 text-red-700 border border-red-200"
            }`}
        >
          {toast.type === "success" ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
          {toast.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <FormField
            label={
              payerType === "government"
                ? "Govt Reimbursement Amount (₹)"
                : "Amount to Collect (₹)"
            }
            error={errors.amount}
            required
          >
            <input
              type="number"
              className={`${inputClass} ${
                isZeroBalance ? "bg-slate-100 text-slate-500 cursor-not-allowed" : ""
              }`}
              value={isZeroBalance ? "0.00" : form.amount}
              onChange={(e) => !isZeroBalance && update("amount", e.target.value)}
              disabled={isZeroBalance}
              readOnly={isZeroBalance}
              min="0"
              step="0.01"
            />
          </FormField>

          <FormField label="Payment Mode" error={errors.payment_mode} required>
            <select
              className={`${inputClass} ${
                isZeroBalance ? "bg-slate-100 text-slate-500 cursor-not-allowed" : ""
              }`}
              value={form.payment_mode}
              onChange={(e) => update("payment_mode", e.target.value)}
              disabled={isZeroBalance}
            >
              {payerType === "government" ? (
                <>
                  <option value="govt_rte">Government Direct Credit (RTGS/Treasury)</option>
                  <option value="cheque">Cheque / Demand Draft</option>
                  <option value="upi">UPI / Online</option>
                  <option value="cash">Cash Voucher</option>
                </>
              ) : (
                <>
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                  <option value="upi">UPI</option>
                  <option value="card">Card</option>
                </>
              )}
            </select>
          </FormField>
        </div>

        {/* ── Conditional Cash Denomination & Return Calculator ──────────────── */}
        {!isZeroBalance && form.payment_mode === "cash" && (
          <div className="animate-in fade-in duration-200">
            <CashDenominationCalculator
              amountToCollect={form.amount}
              cashState={cashState}
              onChange={setCashState}
              onReset={() => setCashState(INITIAL_CASH_STATE)}
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Payment Date" error={errors.payment_date} required>
            <DatePicker
              value={form.payment_date}
              onChange={(val) => update("payment_date", val)}
              className="w-full"
            />
          </FormField>
          <FormField label="Receipt / Sanction No. (Optional)" error={errors.receipt_number}>
            <input
              type="text"
              className={inputClass}
              value={form.receipt_number}
              onChange={(e) => update("receipt_number", e.target.value)}
            />
          </FormField>
        </div>

        {(form.payment_mode === "cheque" ||
          form.payment_mode === "upi" ||
          form.payment_mode === "card" ||
          form.payment_mode === "govt_rte") && (
            <FormField
              label={
                form.payment_mode === "cheque"
                  ? "Cheque No. *"
                  : form.payment_mode === "govt_rte"
                    ? "Govt Claim / Sanction Order Ref No."
                    : "Reference / Transaction No. *"
              }
              error={errors.transaction_id}
            >
              <input
                type="text"
                className={inputClass}
                value={form.transaction_id}
                onChange={(e) => update("transaction_id", e.target.value)}
              />
            </FormField>
          )}

        <FormField label="Note (Optional)" error={errors.note}>
          <textarea
            className={`${inputClass} resize-none`}
            rows={2}
            value={form.note}
            onChange={(e) => update("note", e.target.value)}
          />
        </FormField>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors"
          >
            {isZeroBalance ? "Close" : "Cancel"}
          </button>
          <button
            type="submit"
            disabled={loading || isZeroBalance || isCashInsufficient}
            title={
              isZeroBalance
                ? "This fee is already fully paid"
                : isCashInsufficient
                ? `Received cash is less than amount to collect (Short by ₹${(
                  currentAmountNum - cashCalculation.totalReceived
                ).toLocaleString("en-IN")})`
                : undefined
            }
            className={`flex-1 px-4 py-2.5 text-white rounded-xl text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-sm ${
              isZeroBalance
                ? "bg-slate-400 cursor-not-allowed"
                : isCashInsufficient
                ? "bg-slate-400"
                : payerType === "government"
                  ? "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100"
                  : "bg-blue-600 hover:bg-blue-700 shadow-blue-100"
              }`}
          >
            {loading ? (
              <>
                <Loader2 size={15} className="animate-spin" /> Recording...
              </>
            ) : isZeroBalance ? (
              <>
                <CheckCircle2 size={15} className="text-emerald-300" />
                Fully Paid (₹0.00)
              </>
            ) : isCashInsufficient ? (
              `Short by ₹${(currentAmountNum - cashCalculation.totalReceived).toLocaleString(
                "en-IN"
              )}`
            ) : payerType === "government" ? (
              "Record Govt Reimbursement"
            ) : (
              "Collect Payment"
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
