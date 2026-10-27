"use client";

import React, { useMemo } from "react";
import { Banknote, Coins, RotateCcw, CheckCircle2, AlertCircle, ArrowRightLeft } from "lucide-react";

export interface CashDenominationState {
  notes: {
    500: number;
    200: number;
    100: number;
    50: number;
    20: number;
    10: number;
  };
  coins: {
    20: number;
    10: number;
    5: number;
    2: number;
    1: number;
  };
}

export const INITIAL_CASH_STATE: CashDenominationState = {
  notes: {
    500: 0,
    200: 0,
    100: 0,
    50: 0,
    20: 0,
    10: 0,
  },
  coins: {
    20: 0,
    10: 0,
    5: 0,
    2: 0,
    1: 0,
  },
};

export interface CashCalculationResult {
  totalReceived: number;
  amountToCollect: number;
  changeToReturn: number;
  isSufficient: boolean;
  notesTotal: number;
  coinsTotal: number;
  payloadSummary: Record<string, any>;
  payloadJson: string;
}

export function calculateCashDetails(
  cash: CashDenominationState,
  amountToCollectNum: number
): CashCalculationResult {
  const notesTotal =
    cash.notes[500] * 500 +
    cash.notes[200] * 200 +
    cash.notes[100] * 100 +
    cash.notes[50] * 50 +
    cash.notes[20] * 20 +
    cash.notes[10] * 10;

  const coinsTotal =
    cash.coins[20] * 20 +
    cash.coins[10] * 10 +
    cash.coins[5] * 5 +
    cash.coins[2] * 2 +
    cash.coins[1] * 1;

  const totalReceived = notesTotal + coinsTotal;
  const changeToReturn = Math.max(0, totalReceived - amountToCollectNum);
  const isSufficient = amountToCollectNum <= 0 || totalReceived >= amountToCollectNum;

  // Active breakdown for payload
  const activeBreakdown: Record<string, number> = {};
  if (cash.notes[500] > 0) activeBreakdown["500"] = cash.notes[500];
  if (cash.notes[200] > 0) activeBreakdown["200"] = cash.notes[200];
  if (cash.notes[100] > 0) activeBreakdown["100"] = cash.notes[100];
  if (cash.notes[50] > 0) activeBreakdown["50"] = cash.notes[50];
  if (cash.notes[20] > 0) activeBreakdown["20"] = cash.notes[20];
  if (cash.notes[10] > 0) activeBreakdown["10"] = cash.notes[10];

  if (cash.coins[20] > 0) activeBreakdown["coin_20"] = cash.coins[20];
  if (cash.coins[10] > 0) activeBreakdown["coin_10"] = cash.coins[10];
  if (cash.coins[5] > 0) activeBreakdown["coin_5"] = cash.coins[5];
  if (cash.coins[2] > 0) activeBreakdown["coin_2"] = cash.coins[2];
  if (cash.coins[1] > 0) activeBreakdown["coin_1"] = cash.coins[1];

  const payloadSummary = {
    ...activeBreakdown,
    total_received: totalReceived,
    amount_to_collect: amountToCollectNum,
    return_change: changeToReturn,
    notes_total: notesTotal,
    coins_total: coinsTotal,
    notes: { ...cash.notes },
    coins: { ...cash.coins },
  };

  return {
    totalReceived,
    amountToCollect: amountToCollectNum,
    changeToReturn,
    isSufficient,
    notesTotal,
    coinsTotal,
    payloadSummary,
    payloadJson: JSON.stringify(payloadSummary),
  };
}

interface CashDenominationCalculatorProps {
  amountToCollect: number | string;
  cashState: CashDenominationState;
  onChange: (updated: CashDenominationState) => void;
  onReset?: () => void;
  compact?: boolean;
}

export const NOTE_CONFIG: Array<{
  value: keyof CashDenominationState["notes"];
  label: string;
  colorClass: string;
  badgeClass: string;
}> = [
  { value: 500, label: "₹500", colorClass: "border-slate-300 bg-slate-50", badgeClass: "bg-slate-700 text-white" },
  { value: 200, label: "₹200", colorClass: "border-amber-200 bg-amber-50/50", badgeClass: "bg-amber-600 text-white" },
  { value: 100, label: "₹100", colorClass: "border-indigo-200 bg-indigo-50/50", badgeClass: "bg-indigo-600 text-white" },
  { value: 50, label: "₹50", colorClass: "border-sky-200 bg-sky-50/50", badgeClass: "bg-sky-600 text-white" },
  { value: 20, label: "₹20", colorClass: "border-emerald-200 bg-emerald-50/50", badgeClass: "bg-emerald-600 text-white" },
  { value: 10, label: "₹10", colorClass: "border-orange-200 bg-orange-50/50", badgeClass: "bg-orange-700 text-white" },
];

export const COIN_CONFIG: Array<{
  value: keyof CashDenominationState["coins"];
  label: string;
  badgeClass: string;
}> = [
  { value: 20, label: "₹20 Coin", badgeClass: "bg-amber-500 text-white border border-amber-600" },
  { value: 10, label: "₹10 Coin", badgeClass: "bg-amber-600 text-white border border-amber-700" },
  { value: 5, label: "₹5 Coin", badgeClass: "bg-slate-600 text-white border border-slate-700" },
  { value: 2, label: "₹2 Coin", badgeClass: "bg-slate-500 text-white border border-slate-600" },
  { value: 1, label: "₹1 Coin", badgeClass: "bg-slate-400 text-slate-900 border border-slate-500" },
];

export default function CashDenominationCalculator({
  amountToCollect,
  cashState,
  onChange,
  onReset,
  compact = false,
}: CashDenominationCalculatorProps) {
  const targetAmount = parseFloat(String(amountToCollect || "0")) || 0;

  const calculation = useMemo(() => {
    return calculateCashDetails(cashState, targetAmount);
  }, [cashState, targetAmount]);

  const updateNote = (val: keyof CashDenominationState["notes"], count: number) => {
    const safeCount = Math.max(0, isNaN(count) ? 0 : count);
    onChange({
      ...cashState,
      notes: {
        ...cashState.notes,
        [val]: safeCount,
      },
    });
  };

  const updateCoin = (val: keyof CashDenominationState["coins"], count: number) => {
    const safeCount = Math.max(0, isNaN(count) ? 0 : count);
    onChange({
      ...cashState,
      coins: {
        ...cashState.coins,
        [val]: safeCount,
      },
    });
  };

  const handleReset = () => {
    if (onReset) {
      onReset();
    } else {
      onChange(INITIAL_CASH_STATE);
    }
  };

  const isShort = targetAmount > 0 && calculation.totalReceived < targetAmount;
  const isExact = targetAmount > 0 && calculation.totalReceived === targetAmount;
  const isReturn = targetAmount > 0 && calculation.totalReceived > targetAmount;
  const shortAmount = Math.max(0, targetAmount - calculation.totalReceived);

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/30 p-3.5 sm:p-4 space-y-3.5 transition-all">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pb-2 border-b border-emerald-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
            <Banknote size={16} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              Cash Denomination &amp; Return Calculator
            </h4>
            <p className="text-[10px] text-slate-500">
              Enter received note &amp; coin quantities to auto-calculate change
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-red-600 bg-white hover:bg-red-50 rounded-lg border border-slate-200 hover:border-red-200 transition-colors flex items-center gap-1 shadow-2xs"
          title="Clear all currency denomination inputs"
        >
          <RotateCcw size={12} />
          Reset Cash
        </button>
      </div>

      {/* ── Currency Denominations Grid ─────────────────────────────────── */}
      <div className="space-y-3">
        {/* Currency Notes */}
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Banknote size={13} className="text-slate-500" />
            <span className="text-[11px] font-bold uppercase text-slate-600 tracking-wide">
              Currency Notes (₹500 to ₹10)
            </span>
            <span className="text-[10px] text-slate-400 font-mono ml-auto">
              Subtotal: ₹{calculation.notesTotal.toLocaleString("en-IN")}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {NOTE_CONFIG.map(({ value, label, badgeClass }) => {
              const qty = cashState.notes[value] || 0;
              const subtotal = qty * value;

              return (
                <div
                  key={value}
                  className={`rounded-xl border p-2 bg-white transition-all ${
                    qty > 0
                      ? "border-emerald-400 ring-1 ring-emerald-300 shadow-2xs"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded shadow-2xs ${badgeClass}`}
                    >
                      {label}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-slate-600">
                      ₹{subtotal.toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => updateNote(value, qty - 1)}
                      className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center transition"
                      disabled={qty <= 0}
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="0"
                      value={qty === 0 ? "" : qty}
                      placeholder="0"
                      onChange={(e) => updateNote(value, parseInt(e.target.value, 10))}
                      className="w-full h-6 px-1 text-center font-mono font-bold text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => updateNote(value, qty + 1)}
                      className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center transition"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Currency Coins */}
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Coins size={13} className="text-slate-500" />
            <span className="text-[11px] font-bold uppercase text-slate-600 tracking-wide">
              Coins (₹20 to ₹1)
            </span>
            <span className="text-[10px] text-slate-400 font-mono ml-auto">
              Subtotal: ₹{calculation.coinsTotal.toLocaleString("en-IN")}
            </span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
            {COIN_CONFIG.map(({ value, label, badgeClass }) => {
              const qty = cashState.coins[value] || 0;
              const subtotal = qty * value;

              return (
                <div
                  key={value}
                  className={`rounded-xl border p-1.5 bg-white transition-all ${
                    qty > 0
                      ? "border-emerald-400 ring-1 ring-emerald-300 shadow-2xs"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-[9px] font-bold px-1 py-0.5 rounded-full ${badgeClass}`}
                    >
                      ₹{value}
                    </span>
                    <span className="text-[9px] font-mono text-slate-500">
                      ₹{subtotal}
                    </span>
                  </div>

                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => updateCoin(value, qty - 1)}
                      className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center"
                      disabled={qty <= 0}
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="0"
                      value={qty === 0 ? "" : qty}
                      placeholder="0"
                      onChange={(e) => updateCoin(value, parseInt(e.target.value, 10))}
                      className="w-full h-5 px-0.5 text-center font-mono font-bold text-[11px] bg-slate-50 border border-slate-200 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => updateCoin(value, qty + 1)}
                      className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Summary & Change to Return Block ────────────────────────────── */}
      <div className="pt-2 border-t border-emerald-100 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {/* Total Cash Received */}
        <div className="bg-white rounded-xl border border-slate-200 p-2.5 shadow-2xs flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Total Received
          </span>
          <p className="text-base font-extrabold text-slate-900 font-mono">
            ₹{calculation.totalReceived.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </p>
        </div>

        {/* Amount to Collect */}
        <div className="bg-white rounded-xl border border-slate-200 p-2.5 shadow-2xs flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Amount to Collect
          </span>
          <p className="text-base font-extrabold text-blue-700 font-mono">
            ₹{targetAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </p>
        </div>

        {/* Change to Return / Shortfall Status */}
        <div
          className={`rounded-xl border p-2.5 shadow-2xs flex flex-col justify-between transition-all ${
            isShort
              ? "bg-red-50 border-red-200 text-red-800"
              : isReturn
              ? "bg-emerald-50 border-emerald-300 text-emerald-900"
              : isExact
              ? "bg-teal-50 border-teal-300 text-teal-900"
              : "bg-slate-50 border-slate-200 text-slate-600"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1">
              {isShort ? (
                <>
                  <AlertCircle size={12} className="text-red-500" />
                  Short Amount
                </>
              ) : isReturn ? (
                <>
                  <ArrowRightLeft size={12} className="text-emerald-600" />
                  Change to Return
                </>
              ) : isExact ? (
                <>
                  <CheckCircle2 size={12} className="text-teal-600" />
                  Exact Cash
                </>
              ) : (
                "Change Status"
              )}
            </span>
          </div>

          <div className="mt-0.5">
            {isShort ? (
              <p className="text-base font-black text-red-600 font-mono">
                -₹{shortAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </p>
            ) : isReturn ? (
              <p className="text-base font-black text-emerald-700 font-mono">
                ₹{calculation.changeToReturn.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </p>
            ) : isExact ? (
              <p className="text-sm font-bold text-teal-700">
                ₹0.00 (Exact)
              </p>
            ) : (
              <p className="text-xs text-slate-400 italic">Enter denominations</p>
            )}
          </div>
        </div>
      </div>

      {/* Validation warning banner if short */}
      {isShort && (
        <div className="p-2 rounded-lg bg-red-100/70 border border-red-200 flex items-center gap-2 text-xs text-red-700 font-medium animate-in fade-in duration-200">
          <AlertCircle size={14} className="shrink-0 text-red-500" />
          <span>
            Cash received (₹{calculation.totalReceived.toLocaleString("en-IN")}) is less than amount to collect (₹{targetAmount.toLocaleString("en-IN")}). Please collect the remaining <strong>₹{shortAmount.toLocaleString("en-IN")}</strong> before submitting.
          </span>
        </div>
      )}
    </div>
  );
}
