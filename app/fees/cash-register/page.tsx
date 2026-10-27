"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Banknote,
  Coins,
  Calendar,
  Printer,
  RefreshCw,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  Search,
  Receipt,
  User,
  ShieldCheck,
  Building2,
  TrendingDown,
  TrendingUp,
  PlusCircle,
  X,
  Loader2,
  AlertTriangle,
  BadgeDollarSign,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchDailyCashAudit,
  recordDailyExpense,
  recordBankDeposit,
  recordMiscIncome,
  type DailyCashAuditData,
  type CashRegisterTransaction,
  type CashOutflowItem,
} from "@/lib/fees/cash-register";

// Note colors tailored to Indian Rupee note palettes
const NOTE_THEMES: Record<number, { border: string; bg: string; badge: string; text: string }> = {
  500: {
    border: "border-stone-300 dark:border-stone-700",
    bg: "bg-gradient-to-br from-stone-50 to-stone-100/60 dark:from-stone-900/40 dark:to-stone-800/20",
    badge: "bg-stone-200/80 text-stone-800 dark:bg-stone-800 dark:text-stone-200",
    text: "text-stone-700 dark:text-stone-300",
  },
  200: {
    border: "border-amber-300 dark:border-amber-700",
    bg: "bg-gradient-to-br from-amber-50 to-orange-100/60 dark:from-amber-950/30 dark:to-orange-900/20",
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300",
    text: "text-amber-700 dark:text-amber-300",
  },
  100: {
    border: "border-indigo-300 dark:border-indigo-700",
    bg: "bg-gradient-to-br from-indigo-50 to-violet-100/60 dark:from-indigo-950/30 dark:to-violet-900/20",
    badge: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300",
    text: "text-indigo-700 dark:text-indigo-300",
  },
  50: {
    border: "border-cyan-300 dark:border-cyan-700",
    bg: "bg-gradient-to-br from-cyan-50 to-sky-100/60 dark:from-cyan-950/30 dark:to-sky-900/20",
    badge: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-300",
    text: "text-cyan-700 dark:text-cyan-300",
  },
  20: {
    border: "border-lime-300 dark:border-lime-700",
    bg: "bg-gradient-to-br from-lime-50 to-emerald-100/60 dark:from-lime-950/30 dark:to-emerald-900/20",
    badge: "bg-lime-100 text-lime-800 dark:bg-lime-900/50 dark:text-lime-300",
    text: "text-lime-700 dark:text-lime-300",
  },
  10: {
    border: "border-amber-400 dark:border-amber-800",
    bg: "bg-gradient-to-br from-orange-50 to-amber-100/60 dark:from-orange-950/30 dark:to-amber-900/20",
    badge: "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300",
    text: "text-orange-800 dark:text-orange-300",
  },
};

const EXPENSE_CATEGORIES = [
  "Stationery & Office Supplies",
  "Tea & Refreshments",
  "Postal & Courier",
  "Repairs & Maintenance",
  "Local Travel / Conveyance",
  "Cleaning & Sanitation",
  "Event & Sports Expenses",
  "Emergency Petty Cash",
  "Other / Miscellaneous",
];

const COMMON_BANKS = [
  "State Bank of India (SBI)",
  "HDFC Bank",
  "ICICI Bank",
  "Bank of Baroda",
  "Punjab National Bank",
  "Axis Bank",
  "Canara Bank",
  "Union Bank of India",
  "Other Bank Account",
];

const MISC_INCOME_SOURCES = [
  "Scrap Sale (Paper / Metal)",
  "Form / Prospectus Fee",
  "Donation / Charity",
  "Hall / Ground Rental",
  "Alumni Contribution",
  "Fine / Library Penalty",
  "Other Income",
];

export default function DailyCashRegisterPage() {
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [loading, setLoading] = useState<boolean>(true);
  const [reportData, setReportData] = useState<DailyCashAuditData | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"receipts" | "outflows">("receipts");

  // Modals state
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState<boolean>(false);
  const [expenseAmount, setExpenseAmount] = useState<string>("");
  const [expenseCategory, setExpenseCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [expenseNotes, setExpenseNotes] = useState<string>("");
  const [expenseSubmitting, setExpenseSubmitting] = useState<boolean>(false);

  const [isDepositModalOpen, setIsDepositModalOpen] = useState<boolean>(false);
  const [depositAmount, setDepositAmount] = useState<string>("");
  const [depositBankName, setDepositBankName] = useState<string>(COMMON_BANKS[0]);
  const [depositRef, setDepositRef] = useState<string>("");
  const [depositNotes, setDepositNotes] = useState<string>("");
  const [depositSubmitting, setDepositSubmitting] = useState<boolean>(false);

  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState<boolean>(false);
  const [incomeAmount, setIncomeAmount] = useState<string>("");
  const [incomeCategory, setIncomeCategory] = useState<string>(MISC_INCOME_SOURCES[0]);
  const [incomeNotes, setIncomeNotes] = useState<string>("");
  const [incomeSubmitting, setIncomeSubmitting] = useState<boolean>(false);

  const loadReport = useCallback(async (date: string) => {
    setLoading(true);
    try {
      const res = await fetchDailyCashAudit(date);
      if (res.success && res.data) {
        setReportData(res.data);
      } else {
        toast.error(res.error || "Failed to load cash register report");
      }
    } catch {
      toast.error("An unexpected error occurred while fetching data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReport(selectedDate);
  }, [selectedDate, loadReport]);

  const handlePrint = () => {
    window.print();
  };

  const handleQuickDate = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  const summary = reportData?.summary || {
    opening_balance: 0,
    gross_cash_collected: 0,
    total_change_returned: 0,
    net_fee_cash_collected: 0,
    total_misc_income: 0,
    total_expenses: 0,
    total_bank_deposits: 0,
    net_cash_in_drawer: 0,
    total_transactions: 0,
    total_outflows_count: 0,
  };

  const availableDrawerBalance = Math.max(0, summary.net_cash_in_drawer);

  // Expense Real-Time Validation
  const expenseAmountNum = parseFloat(expenseAmount) || 0;
  const isExpenseOther = expenseCategory === "Other / Miscellaneous";
  const expenseExceedsDrawer = expenseAmountNum > availableDrawerBalance;
  const expenseNotesRequiredAndMissing = isExpenseOther && !expenseNotes.trim();
  const isExpenseValid =
    expenseAmountNum > 0 && !expenseExceedsDrawer && !expenseNotesRequiredAndMissing;

  // Deposit Real-Time Validation
  const depositAmountNum = parseFloat(depositAmount) || 0;
  const depositExceedsDrawer = depositAmountNum > availableDrawerBalance;
  const isDepositValid = depositAmountNum > 0 && !depositExceedsDrawer;

  // Income Real-Time Validation
  const incomeAmountNum = parseFloat(incomeAmount) || 0;
  const isIncomeValid = incomeAmountNum > 0;

  // Submit Expense
  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (expenseAmountNum <= 0) {
      toast.error("Please enter a valid expense amount greater than 0");
      return;
    }
    if (expenseExceedsDrawer) {
      toast.error(
        `Amount ₹${expenseAmountNum} exceeds available drawer balance (₹${availableDrawerBalance.toFixed(2)})`
      );
      return;
    }
    if (expenseNotesRequiredAndMissing) {
      toast.error("Notes / Description is required when category is Other / Miscellaneous");
      return;
    }

    setExpenseSubmitting(true);
    try {
      const res = await recordDailyExpense({
        amount: expenseAmountNum,
        category: expenseCategory,
        notes: expenseNotes.trim(),
        date: selectedDate,
      });

      if (res.success) {
        toast.success(res.data?.message || "Expense recorded successfully 💸");
        setIsExpenseModalOpen(false);
        setExpenseAmount("");
        setExpenseNotes("");
        await loadReport(selectedDate);
      } else {
        toast.error(res.error || "Failed to record expense");
      }
    } catch (err: any) {
      toast.error(err?.message || "Error submitting expense");
    } finally {
      setExpenseSubmitting(false);
    }
  };

  // Submit Bank Deposit
  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (depositAmountNum <= 0) {
      toast.error("Please enter a valid deposit amount greater than 0");
      return;
    }
    if (depositExceedsDrawer) {
      toast.error(
        `Amount ₹${depositAmountNum} exceeds available drawer balance (₹${availableDrawerBalance.toFixed(2)})`
      );
      return;
    }

    setDepositSubmitting(true);
    try {
      const res = await recordBankDeposit({
        amount: depositAmountNum,
        bank_name: depositBankName,
        reference_number: depositRef.trim(),
        notes: depositNotes.trim(),
        date: selectedDate,
      });

      if (res.success) {
        toast.success(res.data?.message || "Bank deposit recorded successfully 🏦");
        setIsDepositModalOpen(false);
        setDepositAmount("");
        setDepositRef("");
        setDepositNotes("");
        await loadReport(selectedDate);
      } else {
        toast.error(res.error || "Failed to record bank deposit");
      }
    } catch (err: any) {
      toast.error(err?.message || "Error submitting bank deposit");
    } finally {
      setDepositSubmitting(false);
    }
  };

  // Submit Misc Income
  const handleIncomeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (incomeAmountNum <= 0) {
      toast.error("Please enter a valid income amount greater than 0");
      return;
    }

    setIncomeSubmitting(true);
    try {
      const res = await recordMiscIncome({
        amount: incomeAmountNum,
        category: incomeCategory,
        notes: incomeNotes.trim(),
        date: selectedDate,
      });

      if (res.success) {
        toast.success(res.data?.message || "Misc income recorded successfully 💵");
        setIsIncomeModalOpen(false);
        setIncomeAmount("");
        setIncomeNotes("");
        await loadReport(selectedDate);
      } else {
        toast.error(res.error || "Failed to record misc income");
      }
    } catch (err: any) {
      toast.error(err?.message || "Error submitting misc income");
    } finally {
      setIncomeSubmitting(false);
    }
  };

  const filteredTransactions = useMemo(() => {
    if (!reportData?.transactions) return [];
    if (!searchQuery.trim()) return reportData.transactions;
    const q = searchQuery.toLowerCase();
    return reportData.transactions.filter(
      (tx) =>
        tx.receipt_number.toLowerCase().includes(q) ||
        tx.student_name.toLowerCase().includes(q) ||
        tx.student_admission_number.toLowerCase().includes(q) ||
        tx.class_name.toLowerCase().includes(q) ||
        tx.collected_by_name.toLowerCase().includes(q)
    );
  }, [reportData, searchQuery]);

  const filteredOutflows = useMemo(() => {
    if (!reportData?.outflows) return [];
    if (!searchQuery.trim()) return reportData.outflows;
    const q = searchQuery.toLowerCase();
    return reportData.outflows.filter(
      (item) =>
        item.category.toLowerCase().includes(q) ||
        item.bank_name.toLowerCase().includes(q) ||
        item.reference_number.toLowerCase().includes(q) ||
        item.notes.toLowerCase().includes(q) ||
        item.recorded_by_name.toLowerCase().includes(q) ||
        item.type_label.toLowerCase().includes(q)
    );
  }, [reportData, searchQuery]);

  const notes = reportData?.denominations?.notes || [];
  const coins = reportData?.denominations?.coins || [];
  const notesTotal = reportData?.denominations?.notes_total_value || 0;
  const coinsTotal = reportData?.denominations?.coins_total_value || 0;

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* ─── Printable Header ─── */}
      <div className="hidden print:block mb-6 border-b border-slate-300 pb-4 text-center">
        <h1 className="text-2xl font-bold uppercase tracking-wider text-slate-900">
          {reportData?.school_name || "School Cash Register"}
        </h1>
        <p className="text-sm text-slate-600 mt-1">Daily Counter Cash Audit & Register Closing Slip</p>
        <p className="text-xs text-slate-600 mt-1">
          <span className="font-bold text-slate-900 text-sm">Audit Date: {selectedDate}</span>
          <span className="mx-2 text-slate-400">|</span>
          <span>Printed on: {new Date().toLocaleString()}</span>
          <span className="mx-2 text-slate-400">|</span>
          <span className="font-semibold text-slate-800">
            Active Tab: {activeTab === "receipts" ? "Cash Receipts" : "Cash Outflows & Incomes"}
          </span>
        </p>
      </div>

      {/* ─── Header & Top Controls ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center ring-1 ring-emerald-500/20">
              <Banknote className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Daily Cash Register
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Track physical cash collections, misc income, expenses, and bank deposits
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls & Date Picker */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Quick Date Pills */}
          <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 p-0.5 bg-white dark:bg-slate-900 shadow-xs text-xs font-medium">
            <button
              type="button"
              onClick={() => handleQuickDate(0)}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                selectedDate === todayStr
                  ? "bg-emerald-600 text-white font-semibold shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => handleQuickDate(-1)}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                selectedDate !== todayStr
                  ? "bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              Yesterday
            </button>
          </div>

          {/* Date Picker Input */}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium text-slate-700 dark:text-slate-200"
            />
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => loadReport(selectedDate)}
            disabled={loading}
            className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-lg shadow-xs hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 transition-colors disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-emerald-600" : ""}`} />
          </button>

          {/* Print Button */}
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white rounded-lg shadow-xs transition-all"
          >
            <Printer className="h-4 w-4" />
            <span>Print Register</span>
          </button>
        </div>
      </div>

      {/* ─── 3 Prominent Summary Cards ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
        {/* Card 1: Gross Cash Collected */}
        <div className="relative overflow-hidden rounded-2xl border border-emerald-200/80 dark:border-emerald-900/50 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent dark:from-emerald-950/40 dark:via-emerald-950/20 p-5 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Gross Cash Collected
            </span>
            <div className="h-10 w-10 rounded-xl bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center ring-1 ring-emerald-500/20">
              <ArrowDownLeft className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 font-mono">
              ₹ {summary.gross_cash_collected.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Total physical currency handed over by parents
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-emerald-100 dark:border-emerald-900/40 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300 font-medium">
            <span>Cash Receipts</span>
            <span className="font-semibold">{summary.total_transactions} Slips</span>
          </div>
        </div>

        {/* Card 2: Total Change Returned */}
        <div className="relative overflow-hidden rounded-2xl border border-rose-200/80 dark:border-rose-900/50 bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-transparent dark:from-rose-950/40 dark:via-rose-950/20 p-5 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-400">
              Total Change Returned
            </span>
            <div className="h-10 w-10 rounded-xl bg-rose-500/15 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center ring-1 ring-rose-500/20">
              <ArrowUpRight className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 font-mono">
              ₹ {summary.total_change_returned.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Change given back to parents from cash drawer
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-rose-100 dark:border-rose-900/40 flex items-center justify-between text-xs text-rose-800 dark:text-rose-300 font-medium">
            <span>Net Fee Cash Inflow</span>
            <span className="font-semibold">
              ₹ {(summary.net_fee_cash_collected || (summary.gross_cash_collected - summary.total_change_returned)).toLocaleString("en-IN")}
            </span>
          </div>
        </div>

        {/* Card 3: Net Cash in Drawer + 3 Action Buttons */}
        <div className="relative overflow-hidden rounded-2xl border-2 border-indigo-500/80 dark:border-indigo-500/80 bg-gradient-to-br from-indigo-500/15 via-indigo-500/5 to-transparent dark:from-indigo-950/50 dark:via-indigo-950/30 p-5 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
              Net Cash in Drawer
            </span>
            <div className="h-10 w-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xs font-medium text-indigo-700 dark:text-indigo-300 mb-1">
              Opening Balance: ₹ {(summary.opening_balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-3xl font-extrabold tracking-tight text-indigo-950 dark:text-indigo-100 font-mono">
              ₹ {summary.net_cash_in_drawer.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Available cash balance after opening balance, misc income, expenses & deposits
            </p>
          </div>

          {/* Deductions & Incomes Breakdown Mini Bar */}
          <div className="mt-3 pt-2 border-t border-indigo-100 dark:border-indigo-900/50 print:border-slate-300 grid grid-cols-3 gap-1 text-[11px]">
            <div className="text-emerald-700 dark:text-emerald-400 print:text-emerald-900 font-semibold print:font-bold truncate">
              +₹{(summary.total_misc_income || 0).toLocaleString("en-IN")} Inc
            </div>
            <div className="text-center text-rose-600 dark:text-rose-400 print:text-rose-900 font-semibold print:font-bold truncate">
              -₹{summary.total_expenses.toLocaleString("en-IN")} Exp
            </div>
            <div className="text-right text-blue-600 dark:text-blue-400 print:text-blue-900 font-semibold print:font-bold truncate">
              -₹{summary.total_bank_deposits.toLocaleString("en-IN")} Dep
            </div>
          </div>

          {/* Print-Only Adjustments Summary */}
          <div className="hidden print:flex flex-col gap-1 mt-2.5 pt-2 border-t border-slate-300 text-[11px] text-slate-800">
            <p>
              <strong className="text-slate-900 font-bold">Opening Balance:</strong>{" "}
              <span className="text-indigo-900 font-bold">₹{(summary.opening_balance || 0).toLocaleString("en-IN")}</span>
              {" | "}
              <strong className="text-slate-900 font-bold">Today&apos;s Adjustments:</strong>{" "}
              <span className="text-emerald-800 font-bold">+₹{(summary.total_misc_income || 0).toLocaleString("en-IN")} Income</span>
              {" | "}
              <span className="text-rose-800 font-bold">-₹{summary.total_expenses.toLocaleString("en-IN")} Expense</span>
              {" | "}
              <span className="text-blue-800 font-bold">-₹{summary.total_bank_deposits.toLocaleString("en-IN")} Bank Deposit</span>
            </p>
          </div>

          {/* Action Buttons Near Net Cash in Drawer (Screen Only) */}
          <div className="mt-3 pt-3 border-t border-indigo-200/80 dark:border-indigo-900/60 grid grid-cols-3 gap-2 print:hidden">
            <button
              type="button"
              onClick={() => setIsIncomeModalOpen(true)}
              className="inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-800 transition-colors shadow-2xs"
              title="Add Miscellaneous Income"
            >
              <span>Add Misc Income 💵</span>
            </button>
            <button
              type="button"
              onClick={() => setIsExpenseModalOpen(true)}
              className="inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:text-rose-300 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800 transition-colors shadow-2xs"
              title="Record Petty Cash Expense"
            >
              <span>Record Expense 💸</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (summary.net_cash_in_drawer > 0) {
                  setDepositAmount(String(summary.net_cash_in_drawer));
                }
                setIsDepositModalOpen(true);
              }}
              className="inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 transition-colors shadow-2xs"
              title="Deposit Cash to Bank"
            >
              <span>Deposit to Bank 🏦</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── Denomination Breakdown Section ─── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Coins className="h-5 w-5 text-emerald-600" />
              <span>Denomination Breakdown</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Itemized count and value of all notes and coins collected today
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium text-slate-700 dark:text-slate-300">
              <span>Notes Value:</span>
              <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">
                ₹{notesTotal.toLocaleString("en-IN")}
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium text-slate-700 dark:text-slate-300">
              <span>Coins Value:</span>
              <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">
                ₹{coinsTotal.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </div>

        {/* Currency Notes Grid */}
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
            <Banknote className="h-3.5 w-3.5 text-slate-400" />
            <span>Currency Notes</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {notes.map((item) => {
              const theme = NOTE_THEMES[item.denomination] || NOTE_THEMES[500];
              const isActive = item.count > 0;
              return (
                <div
                  key={`note-${item.denomination}`}
                  className={`relative rounded-xl border p-3.5 transition-all ${
                    isActive
                      ? `${theme.border} ${theme.bg} shadow-xs ring-1 ring-emerald-500/20`
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 opacity-60"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${theme.badge}`}>
                      ₹{item.denomination}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {isActive ? `${item.count} pcs` : "0 pcs"}
                    </span>
                  </div>
                  <div className="mt-3">
                    <div className="text-xs text-slate-500 dark:text-slate-400">Total Value</div>
                    <div className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5 font-mono">
                      ₹ {item.total_value.toLocaleString("en-IN")}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Currency Coins Grid */}
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
            <Coins className="h-3.5 w-3.5 text-slate-400" />
            <span>Coins</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {coins.map((item) => {
              const isActive = item.count > 0;
              return (
                <div
                  key={`coin-${item.denomination}`}
                  className={`relative rounded-xl border p-3.5 transition-all ${
                    isActive
                      ? "border-amber-300 dark:border-amber-700 bg-gradient-to-br from-amber-50/60 to-yellow-50/30 dark:from-amber-950/20 dark:to-yellow-950/10 shadow-xs ring-1 ring-amber-500/20"
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 opacity-60"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 font-bold text-xs ring-1 ring-amber-400/40">
                      ₹{item.denomination}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {isActive ? `${item.count} pcs` : "0 pcs"}
                    </span>
                  </div>
                  <div className="mt-3">
                    <div className="text-xs text-slate-500 dark:text-slate-400">Total Value</div>
                    <div className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5 font-mono">
                      ₹ {item.total_value.toLocaleString("en-IN")}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── Transaction History Section with Tabs ─── */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden print:border print:border-slate-300 print:shadow-none print:overflow-visible">
        {/* Table Toolbar & Segmented Tabs */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-xl p-1 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab("receipts")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === "receipts"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                <Receipt className="h-3.5 w-3.5 text-emerald-600" />
                <span>Cash Receipts ({filteredTransactions.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("outflows")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === "outflows"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                <TrendingDown className="h-3.5 w-3.5 text-rose-500" />
                <span>Cash Outflows & Incomes ({filteredOutflows.length})</span>
              </button>
            </div>
          </div>

          <div className="relative w-full sm:w-72 print:hidden">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder={
                activeTab === "receipts"
                  ? "Search receipt, student, class..."
                  : "Search expense, income, bank, ref..."
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800 dark:text-slate-200"
            />
          </div>
        </div>

        {/* Tab 1: Cash Receipts Table (Rendered ONLY when Receipts tab is active) */}
        {activeTab === "receipts" && (
          <div className="overflow-x-auto print:block">
            <div className="hidden print:block px-4 py-2.5 bg-slate-100 font-bold text-slate-900 text-xs uppercase tracking-wider border-b border-slate-300">
              Cash Receipts Report ({filteredTransactions.length} Transactions)
            </div>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Receipt #</th>
                <th className="py-3 px-4">Student & Class</th>
                <th className="py-3 px-4">Fee Head</th>
                <th className="py-3 px-4 text-right">Cash Received</th>
                <th className="py-3 px-4 text-right">Change Ret.</th>
                <th className="py-3 px-4 text-right">Net Fee Paid</th>
                <th className="py-3 px-4">Denomination Breakdown</th>
                <th className="py-3 px-4">Cashier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-emerald-600 mb-2" />
                    <span>Loading cash register records...</span>
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <AlertCircle className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="font-medium text-slate-600 dark:text-slate-400">
                      No cash receipts found for this date
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Change the date filter or collect cash payments via the Student Ledger.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr
                    key={`tx-${tx.id}`}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-medium text-slate-900 dark:text-slate-100">
                      {tx.receipt_number}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900 dark:text-slate-100">{tx.student_name}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <span>{tx.class_name}</span>
                        {tx.student_admission_number && (
                          <>
                            <span>•</span>
                            <span>{tx.student_admission_number}</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-medium">
                        {tx.feetype_name}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900 dark:text-slate-100">
                      ₹ {tx.total_received.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-rose-600 dark:text-rose-400">
                      {tx.return_change > 0
                        ? `- ₹ ${tx.return_change.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                        : "₹ 0.00"}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      ₹ {tx.net_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-block max-w-xs truncate text-[11px] text-slate-600 dark:text-slate-400 bg-slate-100/80 dark:bg-slate-800/80 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-mono">
                        {tx.breakdown_text}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3 text-slate-400" />
                        <span>{tx.collected_by_name}</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredTransactions.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 font-bold text-slate-900 dark:text-slate-100">
                  <td colSpan={3} className="py-3 px-4 text-right uppercase tracking-wider text-xs">
                    Total Fee Receipts:
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-xs">
                    ₹ {summary.gross_cash_collected.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-xs text-rose-600 dark:text-rose-400">
                    - ₹ {summary.total_change_returned.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-xs text-emerald-600 dark:text-emerald-400">
                    ₹ {(summary.net_fee_cash_collected || (summary.gross_cash_collected - summary.total_change_returned)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td colSpan={2} className="py-3 px-4 text-xs font-normal text-slate-500">
                    {filteredTransactions.length} Cash Receipts Processed
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        )}

        {/* Tab 2: Cash Outflows & Incomes Table (Rendered ONLY when Outflows tab is active) */}
        {activeTab === "outflows" && (
          <div className="overflow-x-auto print:block">
            <div className="hidden print:block px-4 py-2.5 bg-slate-100 font-bold text-slate-900 text-xs uppercase tracking-wider border-b border-slate-300">
              Cash Outflows & Incomes Report ({filteredOutflows.length} Records)
            </div>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Date / Time</th>
                <th className="py-3 px-4">Transaction Type</th>
                <th className="py-3 px-4">Category / Source / Bank</th>
                <th className="py-3 px-4">Reference / Slip #</th>
                <th className="py-3 px-4">Notes / Purpose</th>
                <th className="py-3 px-4 text-right">Drawer Impact</th>
                <th className="py-3 px-4">Authorized By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-emerald-600 mb-2" />
                    <span>Loading cash transactions...</span>
                  </td>
                </tr>
              ) : filteredOutflows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <TrendingDown className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="font-medium text-slate-600 dark:text-slate-400">
                      No manual cash adjustments recorded for this date
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Click &ldquo;Add Misc Income&rdquo;, &ldquo;Record Expense&rdquo;, or &ldquo;Deposit to Bank&rdquo; above.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredOutflows.map((item) => {
                  const isExpense = item.type === "EXPENSE";
                  const isDeposit = item.type === "BANK_DEPOSIT";
                  const isIncome = item.type === "MISC_INCOME";
                  return (
                    <tr
                      key={`outflow-${item.id}`}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono text-slate-500">
                        {item.created_at ? new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : item.date}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            isExpense
                              ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 ring-1 ring-rose-300/40"
                              : isDeposit
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 ring-1 ring-blue-300/40"
                              : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 ring-1 ring-emerald-300/40"
                          }`}
                        >
                          {isExpense ? "💸 Expense" : isDeposit ? "🏦 Bank Deposit" : "💵 Misc Income"}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">
                        {isDeposit ? item.bank_name : item.category}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
                        {item.reference_number || "-"}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                        {item.notes || "-"}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-mono font-bold ${
                          isIncome
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {isIncome ? `+ ₹ ${item.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : `- ₹ ${item.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3 text-slate-400" />
                          <span>{item.recorded_by_name}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filteredOutflows.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 font-bold text-slate-900 dark:text-slate-100">
                  <td colSpan={5} className="py-3 px-4 text-right uppercase tracking-wider text-xs">
                    Net Adjustments Total:
                  </td>
                  <td
                    className={`py-3 px-4 text-right font-mono text-xs ${
                      (summary.total_misc_income || 0) >= (summary.total_expenses + summary.total_bank_deposits)
                        ? "text-emerald-600"
                        : "text-rose-600"
                    }`}
                  >
                    {(summary.total_misc_income || 0) >= (summary.total_expenses + summary.total_bank_deposits) ? "+" : "-"} ₹ {Math.abs((summary.total_misc_income || 0) - (summary.total_expenses + summary.total_bank_deposits)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-4 text-xs font-normal text-slate-500">
                    {filteredOutflows.length} Records
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        )}
      </div>

      {/* ─── Printable Signature & Sign-off Block ─── */}
      <div className="hidden print:grid grid-cols-3 gap-6 pt-12 mt-8 border-t border-slate-300 text-center text-xs">
        <div>
          <div className="h-10 border-b border-dashed border-slate-400 mb-1"></div>
          <p className="font-semibold text-slate-800">Counter Clerk / Cashier</p>
          <p className="text-slate-500 text-[10px]">Signature & Date</p>
        </div>
        <div>
          <div className="h-10 border-b border-dashed border-slate-400 mb-1"></div>
          <p className="font-semibold text-slate-800">Accountant / Fee In-charge</p>
          <p className="text-slate-500 text-[10px]">Verification Signature</p>
        </div>
        <div>
          <div className="h-10 border-b border-dashed border-slate-400 mb-1"></div>
          <p className="font-semibold text-slate-800">Principal / Trustee</p>
          <p className="text-slate-500 text-[10px]">Approved for Vault / Bank Deposit</p>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════════
          MODAL 1: RECORD EXPENSE 💸 (With Strict Drawer Balance & "Other" Notes Validation)
      ════════════════════════════════════════════════════════════════════════════ */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                  <TrendingDown className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Record Daily Cash Expense</h3>
                  <p className="text-[11px] text-slate-500">
                    Available in Drawer: <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">₹{availableDrawerBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsExpenseModalOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 flex items-center justify-center transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleExpenseSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Expense Amount (₹) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    placeholder="e.g. 350"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    required
                    autoFocus
                    className={`w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg focus:outline-none focus:ring-2 font-mono font-bold text-sm ${
                      expenseExceedsDrawer
                        ? "border-rose-500 text-rose-600 focus:ring-rose-500/30"
                        : "border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-rose-500/20 focus:border-rose-500"
                    }`}
                  />
                </div>

                {/* Real-time Drawer Limit Warning */}
                {expenseExceedsDrawer && (
                  <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    <span>Amount exceeds available drawer balance (₹{availableDrawerBalance.toFixed(2)})</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Expense Category <span className="text-rose-500">*</span>
                </label>
                <select
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-medium text-slate-800 dark:text-slate-200"
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notes / Voucher Details {isExpenseOther ? <span className="text-rose-500">(Required *)</span> : <span className="text-slate-400">(Optional)</span>}
                </label>
                <textarea
                  rows={2}
                  placeholder={
                    isExpenseOther
                      ? "Mandatory: Describe the specific nature of this miscellaneous expense..."
                      : "e.g. Purchased exam paper bundles from local vendor..."
                  }
                  value={expenseNotes}
                  onChange={(e) => setExpenseNotes(e.target.value)}
                  required={isExpenseOther}
                  className={`w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg focus:outline-none focus:ring-2 text-slate-800 dark:text-slate-200 ${
                    expenseNotesRequiredAndMissing && expenseAmountNum > 0
                      ? "border-amber-400 focus:ring-amber-500/20"
                      : "border-slate-200 dark:border-slate-700 focus:ring-rose-500/20 focus:border-rose-500"
                  }`}
                />
                {isExpenseOther && !expenseNotes.trim() && (
                  <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
                    * Please specify a brief description for &ldquo;Other / Miscellaneous&rdquo; expenses before saving.
                  </p>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!isExpenseValid || expenseSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-xs transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {expenseSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Confirm Expense</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          MODAL 2: DEPOSIT TO BANK 🏦 (With Strict Drawer Balance Validation)
      ════════════════════════════════════════════════════════════════════════════ */}
      {isDepositModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Deposit Cash to Bank</h3>
                  <p className="text-[11px] text-slate-500">
                    Available in Drawer: <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">₹{availableDrawerBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDepositModalOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 flex items-center justify-center transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleDepositSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Deposit Amount (₹) <span className="text-indigo-500">*</span>
                  </label>
                  {availableDrawerBalance > 0 && (
                    <button
                      type="button"
                      onClick={() => setDepositAmount(String(availableDrawerBalance))}
                      className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                    >
                      Use Full Drawer (₹{availableDrawerBalance.toLocaleString("en-IN")})
                    </button>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    placeholder="e.g. 15000"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    required
                    autoFocus
                    className={`w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg focus:outline-none focus:ring-2 font-mono font-bold text-sm ${
                      depositExceedsDrawer
                        ? "border-rose-500 text-rose-600 focus:ring-rose-500/30"
                        : "border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-indigo-500/20 focus:border-indigo-500"
                    }`}
                  />
                </div>

                {/* Real-time Drawer Limit Warning */}
                {depositExceedsDrawer && (
                  <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    <span>Amount exceeds available drawer balance (₹{availableDrawerBalance.toFixed(2)})</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Bank Name <span className="text-indigo-500">*</span>
                </label>
                <select
                  value={depositBankName}
                  onChange={(e) => setDepositBankName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium text-slate-800 dark:text-slate-200"
                >
                  {COMMON_BANKS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Deposit Slip # / UTR / Reference No.
                </label>
                <input
                  type="text"
                  placeholder="e.g. SLIP-2026-9812"
                  value={depositRef}
                  onChange={(e) => setDepositRef(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono text-slate-800 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Deposited by accountant Mr. Sharma at City Branch..."
                  value={depositNotes}
                  onChange={(e) => setDepositNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsDepositModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!isDepositValid || depositSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {depositSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Confirm Bank Deposit</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          MODAL 3: ADD MISC. INCOME 💵
      ════════════════════════════════════════════════════════════════════════════ */}
      {isIncomeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <BadgeDollarSign className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Add Miscellaneous Income</h3>
                  <p className="text-[11px] text-slate-500">Adds directly to today&apos;s physical drawer balance</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsIncomeModalOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 flex items-center justify-center transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleIncomeSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Income Amount (₹) <span className="text-emerald-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    placeholder="e.g. 1200"
                    value={incomeAmount}
                    onChange={(e) => setIncomeAmount(e.target.value)}
                    required
                    autoFocus
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono font-bold text-slate-900 dark:text-slate-100 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Source / Category <span className="text-emerald-500">*</span>
                </label>
                <select
                  value={incomeCategory}
                  onChange={(e) => setIncomeCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium text-slate-800 dark:text-slate-200"
                >
                  {MISC_INCOME_SOURCES.map((src) => (
                    <option key={src} value={src}>
                      {src}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notes / Source Description (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Sold old newspapers, broken furniture, and lab scrap..."
                  value={incomeNotes}
                  onChange={(e) => setIncomeNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsIncomeModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!isIncomeValid || incomeSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {incomeSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Confirm Misc Income</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
