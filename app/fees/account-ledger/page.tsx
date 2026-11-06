"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  BookOpen,
  Calendar,
  Printer,
  Download,
  Search,
  RefreshCw,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  Receipt,
  Building2,
  TrendingUp,
  TrendingDown,
  Filter,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  ArrowUpDown,
  Coins,
  BadgePercent,
  Banknote,
  X,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchAccountLedger,
  setInitialCash,
  type AccountLedgerData,
  type LedgerTransactionItem,
  type LedgerTransactionType,
} from "@/lib/fees/account-ledger";

const toLocalDateString = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function AccountLedgerPage() {
  const today = new Date();
  const todayStr = toLocalDateString(today);
  const firstDayOfMonthStr = toLocalDateString(new Date(today.getFullYear(), today.getMonth(), 1));

  const [startDate, setStartDate] = useState(firstDayOfMonthStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [activeTypeFilter, setActiveTypeFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  const [ledgerData, setLedgerData] = useState<AccountLedgerData | null>(null);
  const [loading, setLoading] = useState(true);

  // Initial Petty Cash Drawer Float modal state
  const [isInitialCashModalOpen, setIsInitialCashModalOpen] = useState(false);
  const [initialCashAmount, setInitialCashAmount] = useState("");
  const [initialCashDate, setInitialCashDate] = useState(firstDayOfMonthStr);
  const [initialCashNotes, setInitialCashNotes] = useState("Initial Petty Cash Float");
  const [savingInitialCash, setSavingInitialCash] = useState(false);

  // Load report data
  const loadLedger = useCallback(
    async (start: string, end: string, order: "asc" | "desc" = sortOrder) => {
      setLoading(true);
      try {
        const res = await fetchAccountLedger({
          startDate: start,
          endDate: end,
          order,
        });

        if (res.success && res.data) {
          setLedgerData(res.data);
        } else {
          toast.error(res.error || "Failed to load account ledger");
        }
      } catch (err: any) {
        toast.error(err?.message || "An unexpected error occurred");
      } finally {
        setLoading(false);
      }
    },
    [sortOrder]
  );

  useEffect(() => {
    loadLedger(startDate, endDate);
  }, []);

  // Quick Date Range Helpers
  const handleQuickRange = (type: "today" | "yesterday" | "this_month" | "last_30_days") => {
    const now = new Date();
    let s = todayStr;
    let e = todayStr;

    if (type === "today") {
      s = todayStr;
      e = todayStr;
    } else if (type === "yesterday") {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = toLocalDateString(y);
      s = yStr;
      e = yStr;
    } else if (type === "this_month") {
      s = firstDayOfMonthStr;
      e = todayStr;
    } else if (type === "last_30_days") {
      const past = new Date();
      past.setDate(past.getDate() - 30);
      s = toLocalDateString(past);
      e = todayStr;
    }

    setStartDate(s);
    setEndDate(e);
    loadLedger(s, e);
  };

  const handleApplyFilter = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (startDate > endDate) {
      toast.error("Start date cannot be after end date");
      return;
    }
    loadLedger(startDate, endDate);
  };

  const handleToggleSort = () => {
    const newOrder = sortOrder === "desc" ? "asc" : "desc";
    setSortOrder(newOrder);
    loadLedger(startDate, endDate, newOrder);
  };

  // Filtered transactions in memory (search & type)
  const filteredTransactions = useMemo(() => {
    if (!ledgerData?.transactions) return [];
    let list = ledgerData.transactions;

    if (activeTypeFilter !== "ALL") {
      list = list.filter((tx) => activeTypeFilter === "FEE_RECEIPT"
        ? tx.transaction_type === "FEE_RECEIPT" || tx.transaction_type === "NON_CASH_FEE_RECEIPT"
        : tx.transaction_type === activeTypeFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (tx) =>
          tx.reference_no.toLowerCase().includes(q) ||
          tx.particulars.toLowerCase().includes(q) ||
          tx.source.toLowerCase().includes(q) ||
          tx.category.toLowerCase().includes(q) ||
          tx.payment_mode.toLowerCase().includes(q) ||
          tx.recorded_by_name.toLowerCase().includes(q) ||
          tx.notes.toLowerCase().includes(q)
      );
    }

    return list;
  }, [ledgerData, activeTypeFilter, searchQuery]);

  // Dynamic totals for currently filtered list
  const filteredInflowTotal = useMemo(
    () => filteredTransactions.reduce((acc, tx) => acc + (tx.inflow || 0), 0),
    [filteredTransactions]
  );
  const filteredOutflowTotal = useMemo(
    () => filteredTransactions.reduce((acc, tx) => acc + (tx.outflow || 0), 0),
    [filteredTransactions]
  );
  const filteredFeeCollectionTotal = useMemo(
    () => filteredTransactions.reduce((acc, tx) => acc + (tx.collection_amount || 0), 0),
    [filteredTransactions]
  );

  // Summary object from API
  const summary = ledgerData?.summary || {
    total_fee_collected: 0,
    fee_payment_count: 0,
    fee_collection_by_mode: [],
    opening_balance: 0,
    total_inflow: 0,
    total_outflow: 0,
    net_change: 0,
    closing_balance: 0,
    total_transactions: 0,
    fee_receipts_count: 0,
    expenses_count: 0,
    bank_deposits_count: 0,
    misc_income_count: 0,
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (!filteredTransactions.length) {
      toast.error("No transactions to export");
      return;
    }

    const headers = [
      "Date",
      "Time",
      "Transaction Type",
      "Reference / Slip #",
      "Particulars / Details",
      "Category",
      "Source / Student",
      "Fee Collected (₹)",
      "Inflow (₹)",
      "Outflow (₹)",
      "Running Balance (₹)",
      "Recorded By",
      "Notes",
    ];

    const rows = filteredTransactions.map((tx) => [
      tx.date,
      tx.time,
      tx.type_label,
      `"${tx.reference_no.replace(/"/g, '""')}"`,
      `"${tx.particulars.replace(/"/g, '""')}"`,
      `"${tx.category.replace(/"/g, '""')}"`,
      `"${tx.source.replace(/"/g, '""')}"`,
      Number(tx.collection_amount || 0).toFixed(2),
      tx.inflow.toFixed(2),
      tx.outflow.toFixed(2),
      tx.running_balance.toFixed(2),
      `"${tx.recorded_by_name.replace(/"/g, '""')}"`,
      `"${(tx.notes || "").replace(/"/g, '""')}"`,
    ]);

    // Summary row
    rows.push([]);
    rows.push([
      "SUMMARY",
      "",
      "",
      `Opening Balance: ₹${summary.opening_balance.toFixed(2)}`,
      `Total Inflow: ₹${summary.total_inflow.toFixed(2)}`,
      `Total Outflow: ₹${summary.total_outflow.toFixed(2)}`,
      `Closing Balance: ₹${summary.closing_balance.toFixed(2)}`,
      filteredFeeCollectionTotal.toFixed(2),
      filteredInflowTotal.toFixed(2),
      filteredOutflowTotal.toFixed(2),
      "",
      "",
      "",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `account_ledger_${startDate}_to_${endDate}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Account ledger exported to CSV successfully 📄");
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSaveInitialCash = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(initialCashAmount);
    if (isNaN(amt) || amt < 0) {
      toast.error("Please enter a valid cash float amount");
      return;
    }
    setSavingInitialCash(true);
    try {
      const res = await setInitialCash({
        amount: amt,
        date: initialCashDate,
        notes: initialCashNotes,
      });
      if (res.success) {
        toast.success(res.data?.message || "Initial petty cash updated successfully! 💰");
        setIsInitialCashModalOpen(false);
        setInitialCashAmount("");
        loadLedger(startDate, endDate);
      } else {
        toast.error(res.error || "Failed to set initial cash");
      }
    } catch (err: any) {
      toast.error(err?.message || "An error occurred");
    } finally {
      setSavingInitialCash(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* ─── Printable Header (Screen Hidden) ─── */}
      <div className="hidden print:block mb-6 border-b border-slate-300 pb-4 text-center">
        <h1 className="text-2xl font-bold uppercase tracking-wider text-slate-900">
          {ledgerData?.school_name || "School Management System"}
        </h1>
        <p className="text-base font-semibold text-slate-700 mt-1">General Account Ledger / All Transactions</p>
        <p className="text-xs text-slate-600 mt-1">
          <span className="font-bold text-slate-900">Period: {startDate} to {endDate}</span>
          <span className="mx-2 text-slate-400">|</span>
          <span>Printed on: {new Date().toLocaleString()}</span>
          <span className="mx-2 text-slate-400">|</span>
          <span>Total Records: {filteredTransactions.length}</span>
        </p>
      </div>

      {/* ─── Header & Top Controls ─── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center ring-1 ring-indigo-500/20">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  Account Ledger
                </h1>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  Cash Ledger + All Fee Payments
                </span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Cash balance transactions plus verified fee payments from every payment mode
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons: Set Initial Cash, Export & Print */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setInitialCashDate(startDate);
              setIsInitialCashModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-lg shadow-xs hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors"
            title="Set Initial Petty Cash / Cash Float"
          >
            <Wallet className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span>Set Initial Petty Cash</span>
          </button>
        </div>
      </div>

      {/* ─── Date Range Filter Bar ─── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs print:hidden space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Quick Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium">
            <span className="text-slate-400 font-normal mr-1">Period:</span>
            <button
              type="button"
              onClick={() => handleQuickRange("this_month")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                startDate === firstDayOfMonthStr && endDate === todayStr
                  ? "bg-indigo-600 text-white font-semibold shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => handleQuickRange("today")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                startDate === todayStr && endDate === todayStr
                  ? "bg-indigo-600 text-white font-semibold shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => handleQuickRange("yesterday")}
              className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
            >
              Yesterday
            </button>
            <button
              type="button"
              onClick={() => handleQuickRange("last_30_days")}
              className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
            >
              Last 30 Days
            </button>
          </div>

          {/* Date Picker Form */}
          <form
            onSubmit={handleApplyFilter}
            className="flex flex-wrap items-center gap-2.5"
          >
            <div className="flex items-center gap-2">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-2xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  title="Start Date"
                />
              </div>
              <span className="text-slate-400 text-xs font-medium">to</span>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-2xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  title="End Date"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
            >
              <Filter className="h-3.5 w-3.5" />
              <span>Filter</span>
            </button>

            <button
              type="button"
              onClick={() => loadLedger(startDate, endDate)}
              disabled={loading}
              className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition-colors disabled:opacity-50"
              title="Refresh Data"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin text-indigo-600" : ""}`}
              />
            </button>
          </form>
        </div>
      </div>

      {/* ─── 5 Prominent Summary KPI Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* Card 1: Opening Cash Balance */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-indigo-500/10 via-slate-50 to-transparent dark:from-indigo-950/30 dark:via-slate-900 p-5 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
              Opening Cash Balance
            </span>
            <div className="h-9 w-9 rounded-xl bg-indigo-500/15 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center ring-1 ring-indigo-500/20">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className={`text-2xl lg:text-3xl font-extrabold tracking-tight font-mono ${summary.opening_balance < 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-slate-100"}`}>
              ₹ {summary.opening_balance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Cash carried forward prior to {startDate}
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-[11px]">
            <span className="text-indigo-700 dark:text-indigo-300 font-medium">Starting Drawer Position</span>
            <button
              type="button"
              onClick={() => {
                setInitialCashDate(startDate);
                setIsInitialCashModalOpen(true);
              }}
              className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 underline decoration-indigo-300 underline-offset-2"
            >
              Set Initial Cash
            </button>
          </div>
        </div>

        {/* Card 2: Cash Inflow & Outflow */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-slate-500/10 via-slate-50 to-transparent dark:from-slate-950/30 dark:via-slate-900 p-5 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Cash Inflow / Outflow
            </span>
            <div className="h-9 w-9 rounded-xl bg-slate-500/15 text-slate-600 dark:text-slate-400 flex items-center justify-center">
              <ArrowUpDown className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 space-y-1">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Inflow:</span>
              <span className="text-lg font-extrabold text-emerald-700 dark:text-emerald-400 font-mono">
                +₹ {summary.total_inflow.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-medium text-rose-600 dark:text-rose-400">Outflow:</span>
              <span className="text-lg font-extrabold text-rose-600 dark:text-rose-400 font-mono">
                -₹ {summary.total_outflow.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 font-medium">
            <span>{summary.fee_receipts_count} In • {summary.expenses_count + summary.bank_deposits_count} Out</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              Net: {summary.net_change >= 0 ? "+" : ""}₹{summary.net_change.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Card 3: Cash in Drawer (Hand Cash) */}
        <div className="relative overflow-hidden rounded-2xl border-2 border-emerald-500/70 dark:border-emerald-500/60 bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent dark:from-emerald-950/40 dark:via-emerald-950/20 p-5 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
              Cash in Drawer (Hand Cash)
            </span>
            <div className="h-9 w-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Coins className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl lg:text-3xl font-extrabold tracking-tight text-emerald-950 dark:text-emerald-100 font-mono">
              ₹ {(summary.cash_in_drawer ?? (summary.opening_balance + summary.total_inflow - summary.total_outflow)).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="mt-1 text-xs text-emerald-800/80 dark:text-emerald-300/80 font-medium">
              Physical Cash Available in Office Drawer
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between text-[11px] font-semibold text-emerald-900 dark:text-emerald-200">
            <span>Reconciles with drawer count</span>
            <span className="px-1.5 py-0.5 rounded-sm bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 text-[10px]">
              Cash Only
            </span>
          </div>
        </div>

        {/* Card 4: Total Bank Balance (Online / Bank) */}
        <div className="relative overflow-hidden rounded-2xl border-2 border-sky-500/70 dark:border-sky-500/60 bg-gradient-to-br from-sky-500/15 via-sky-500/5 to-transparent dark:from-sky-950/40 dark:via-sky-950/20 p-5 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-sky-800 dark:text-sky-300">
              Total Bank Balance (Online / Bank)
            </span>
            <div className="h-9 w-9 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-xs">
              <Building2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl lg:text-3xl font-extrabold tracking-tight text-sky-950 dark:text-sky-100 font-mono">
              ₹ {(summary.total_bank_collection ?? summary.total_fee_collected ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="mt-1 text-xs text-sky-800/80 dark:text-sky-300/80 font-medium">
              Direct Bank Settlements (UPI, Razorpay, Cheque)
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-sky-200 dark:border-sky-800/60 flex items-center justify-between text-[11px] font-semibold text-sky-900 dark:text-sky-200">
            <span>Settled directly in school account</span>
            <span className="px-1.5 py-0.5 rounded-sm bg-sky-100 dark:bg-sky-900/60 text-sky-800 dark:text-sky-200 text-[10px]">
              Bank/Online
            </span>
          </div>
        </div>

        {/* Card 5: Total Consolidated Funds / Master Position */}
        <div className="relative overflow-hidden rounded-2xl border-2 border-indigo-600 dark:border-indigo-500 bg-gradient-to-br from-indigo-600/15 via-indigo-600/5 to-transparent dark:from-indigo-950/60 dark:via-indigo-950/30 p-5 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-900 dark:text-indigo-200">
              Total School Funds (=)
            </span>
            <div className="h-9 w-9 rounded-xl bg-indigo-700 text-white flex items-center justify-center shadow-xs">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl lg:text-3xl font-extrabold tracking-tight text-indigo-950 dark:text-indigo-50 font-mono">
              ₹ {((summary.cash_in_drawer ?? (summary.opening_balance + summary.total_inflow - summary.total_outflow)) + (summary.total_bank_collection ?? 0)).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="mt-1 text-xs text-indigo-700 dark:text-indigo-300 font-medium">
              Grand Consolidated Position (Cash + Bank Combined)
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-indigo-200 dark:border-indigo-800/60 flex items-center justify-between text-[11px] font-bold text-indigo-900 dark:text-indigo-200">
            <span>Combined Drawer Cash + Bank Collections</span>
            <span className="text-emerald-700 dark:text-emerald-400">Master Net</span>
          </div>
        </div>
      </div>

      {/* ─── Search & Transaction Type Pills ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 print:hidden">
        {/* Type Filter Pills */}
        <div className="inline-flex flex-wrap items-center gap-1.5 p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs">
          {[
            { id: "ALL", label: `All (${ledgerData?.transactions?.length || 0})` },
            { id: "FEE_RECEIPT", label: `Fee Payments (${summary.fee_receipts_count})` },
            { id: "EXPENSE", label: `Expenses (${summary.expenses_count})` },
            { id: "BANK_DEPOSIT", label: `Bank Deposits (${summary.bank_deposits_count})` },
            { id: "MISC_INCOME", label: `Misc Incomes (${summary.misc_income_count})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTypeFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTypeFilter === tab.id
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search input & Sort Order Toggle */}
        <div className="flex items-center gap-2">
          <div className="relative min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search slip #, particulars, notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xs placeholder:text-slate-400 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <button
            type="button"
            onClick={handleToggleSort}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            title={`Toggle sort order (Current: ${sortOrder === "desc" ? "Newest First" : "Oldest First"})`}
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            <span>{sortOrder === "desc" ? "Newest First" : "Oldest First"}</span>
          </button>
        </div>
      </div>

      {/* ─── Main Ledger Data Table ─── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider divide-x divide-slate-200/80 dark:divide-slate-800">
                <th className="py-3.5 px-4 whitespace-nowrap">Date & Time</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Type & Mode</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Slip / Ref #</th>
                <th className="py-3.5 px-4 min-w-[260px]">Particulars / Source</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Recorded By</th>
                <th className="py-3.5 px-4 text-right whitespace-nowrap">Fee Collected</th>
                <th className="py-3.5 px-4 text-right whitespace-nowrap">Cash Inflow (+)</th>
                <th className="py-3.5 px-4 text-right whitespace-nowrap">Cash Outflow (-)</th>
                <th className="py-3.5 px-4 text-right whitespace-nowrap">Drawer Cash Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {/* Row 0: Opening Balance Line */}
              <tr className="bg-indigo-50/40 dark:bg-indigo-950/20 font-medium divide-x divide-indigo-100 dark:divide-indigo-950/40">
                <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300" colSpan={3}>
                  <div className="flex items-center gap-1.5">
                    <Wallet className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Prior to {startDate}</span>
                  </div>
                </td>
                <td className="py-3 px-4 font-semibold text-indigo-900 dark:text-indigo-200">
                  Opening Cash Balance (Carried Forward)
                </td>
                <td className="py-3 px-4 text-slate-400">-</td>
                <td className="py-3 px-4 text-right text-slate-400">-</td>
                <td className="py-3 px-4 text-right text-slate-400">-</td>
                <td className="py-3 px-4 text-right text-slate-400">-</td>
                <td className="py-3 px-4 text-right font-mono font-bold text-indigo-900 dark:text-indigo-200">
                  ₹ {summary.opening_balance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>

              {/* Transaction Items */}
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="h-6 w-6 animate-spin text-indigo-600" />
                      <span className="text-sm">Fetching ledger records...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <img
                        src="/images/empty-folder.png"
                        alt="No transactions"
                        className="mx-auto mb-1 h-20 w-20 object-contain"
                      />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        No transactions found for the selected period
                      </span>
                      <p className="text-xs text-slate-400">
                        Try selecting another date range or clearing filters
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const isFee = tx.transaction_type === "FEE_RECEIPT";
                  const isNonCashFee = tx.transaction_type === "NON_CASH_FEE_RECEIPT";
                  const isIncome = tx.transaction_type === "MISC_INCOME";
                  const isExpense = tx.transaction_type === "EXPENSE";
                  const isDeposit = tx.transaction_type === "BANK_DEPOSIT";

                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors divide-x divide-slate-100 dark:divide-slate-800/60"
                    >
                      {/* Date & Time */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-medium text-slate-900 dark:text-slate-100 font-mono">
                          {tx.date}
                        </div>
                        {tx.time && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            {tx.time}
                          </div>
                        )}
                      </td>

                      {/* Type Badge */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isFee && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                            Fee Receipt
                          </span>
                        )}
                        {isNonCashFee && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                            Fee Receipt · {tx.payment_mode}
                          </span>
                        )}
                        {isIncome && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                            <span className="h-1.5 w-1.5 rounded-full bg-teal-600" />
                            Misc Income
                          </span>
                        )}
                        {isExpense && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-600" />
                            Daily Expense
                          </span>
                        )}
                        {isDeposit && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                            Bank Deposit
                          </span>
                        )}
                      </td>

                      {/* Ref / Slip # */}
                      <td className="py-3 px-4 whitespace-nowrap font-mono font-medium text-slate-700 dark:text-slate-300">
                        {tx.reference_no}
                      </td>

                      {/* Particulars */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {tx.particulars}
                        </div>
                        {tx.notes && tx.notes !== tx.particulars && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1 italic">
                            &quot;{tx.notes}&quot;
                          </div>
                        )}
                      </td>

                      {/* Recorded By */}
                      <td className="py-3 px-4 whitespace-nowrap text-slate-600 dark:text-slate-400">
                        {tx.recorded_by_name}
                      </td>

                      {/* Fee collection amount, including non-cash payments */}
                      <td className="py-3 px-4 text-right whitespace-nowrap font-mono font-semibold text-sky-700 dark:text-sky-300">
                        {(tx.collection_amount || 0) > 0 ? `₹ ${Number(tx.collection_amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : <span className="text-slate-300">-</span>}
                      </td>

                      {/* Inflow (+) */}
                      <td className="py-3 px-4 text-right whitespace-nowrap font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {tx.inflow > 0 ? (
                          `+₹ ${tx.inflow.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        ) : (
                          <span className="text-slate-300 dark:text-slate-700 font-normal">-</span>
                        )}
                      </td>

                      {/* Outflow (-) */}
                      <td className="py-3 px-4 text-right whitespace-nowrap font-mono font-bold text-rose-600 dark:text-rose-400">
                        {tx.outflow > 0 ? (
                          `-₹ ${tx.outflow.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        ) : (
                          <span className="text-slate-300 dark:text-slate-700 font-normal">-</span>
                        )}
                      </td>

                      {/* Running Balance */}
                      <td className="py-3 px-4 text-right whitespace-nowrap font-mono font-semibold text-slate-700 dark:text-slate-300">
                        ₹ {tx.running_balance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* ─── Summary Footer Row ─── */}
            <tfoot>
              <tr className="bg-slate-100 dark:bg-slate-800/90 font-bold border-t-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs divide-x divide-slate-200 dark:divide-slate-700">
                <td className="py-3.5 px-4" colSpan={5}>
                  <div className="flex items-center gap-2">
                    <span>Summary Totals ({filteredTransactions.length} records shown)</span>
                    <span className="text-slate-400 font-normal">|</span>
                    <span className="text-slate-600 dark:text-slate-400 font-normal">
                      Period: {startDate} to {endDate}
                    </span>
                  </div>
                </td>
                <td className="py-3.5 px-4 text-right font-mono font-bold text-sky-700 dark:text-sky-300 whitespace-nowrap">
                  ₹ {filteredFeeCollectionTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                  +₹ {filteredInflowTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="py-3.5 px-4 text-right font-mono font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                  -₹ {filteredOutflowTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="py-3.5 px-4 text-right font-mono font-extrabold text-indigo-700 dark:text-indigo-300 whitespace-nowrap">
                  ₹ {summary.closing_balance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ─── Set Initial Petty Cash Modal ─── */}
      {isInitialCashModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center ring-1 ring-indigo-500/20">
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Set Initial Petty Cash
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Starting drawer float (remedies negative opening balance)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsInitialCashModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveInitialCash} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Starting Cash Float Amount (₹) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="e.g. 5000"
                    value={initialCashAmount}
                    onChange={(e) => setInitialCashAmount(e.target.value)}
                    className="w-full pl-8 pr-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Enter physical cash in drawer when accounting started.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Effective Start Date
                </label>
                <input
                  type="date"
                  value={initialCashDate}
                  onChange={(e) => setInitialCashDate(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notes / Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Initial Drawer Float established by Management"
                  value={initialCashNotes}
                  onChange={(e) => setInitialCashNotes(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsInitialCashModalOpen(false)}
                  disabled={savingInitialCash}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingInitialCash}
                  className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors disabled:opacity-50"
                >
                  {savingInitialCash ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Starting Float</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
