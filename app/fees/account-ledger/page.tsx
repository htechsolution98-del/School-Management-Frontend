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
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchAccountLedger,
  type AccountLedgerData,
  type LedgerTransactionItem,
  type LedgerTransactionType,
} from "@/lib/fees/account-ledger";

export default function AccountLedgerPage() {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const firstDayOfMonthStr = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .split("T")[0];

  const [startDate, setStartDate] = useState(firstDayOfMonthStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [activeTypeFilter, setActiveTypeFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  const [ledgerData, setLedgerData] = useState<AccountLedgerData | null>(null);
  const [loading, setLoading] = useState(true);

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
      const yStr = y.toISOString().split("T")[0];
      s = yStr;
      e = yStr;
    } else if (type === "this_month") {
      s = firstDayOfMonthStr;
      e = todayStr;
    } else if (type === "last_30_days") {
      const past = new Date();
      past.setDate(past.getDate() - 30);
      s = past.toISOString().split("T")[0];
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
      list = list.filter((tx) => tx.transaction_type === activeTypeFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (tx) =>
          tx.reference_no.toLowerCase().includes(q) ||
          tx.particulars.toLowerCase().includes(q) ||
          tx.source.toLowerCase().includes(q) ||
          tx.category.toLowerCase().includes(q) ||
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

  // Summary object from API
  const summary = ledgerData?.summary || {
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
                  All Cash Transactions
                </span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Unified chronological cash ledger: fee receipts, daily expenses, bank deposits & misc incomes
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons: Export & Print */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={loading || !filteredTransactions.length}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
            title="Download CSV Spreadsheet"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white rounded-lg shadow-xs transition-all disabled:opacity-50"
            title="Print Account Ledger"
          >
            <Printer className="h-4 w-4" />
            <span>Print Ledger</span>
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

      {/* ─── 4 Prominent Summary KPI Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Opening Balance */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-indigo-500/10 via-slate-50 to-transparent dark:from-indigo-950/30 dark:via-slate-900 p-5 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
              Opening Balance
            </span>
            <div className="h-9 w-9 rounded-xl bg-indigo-500/15 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center ring-1 ring-indigo-500/20">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl lg:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 font-mono">
              ₹ {summary.opening_balance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Balance carried forward prior to {startDate}
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-800 text-[11px] text-indigo-700 dark:text-indigo-300 font-medium">
            Starting Drawer Cash Position
          </div>
        </div>

        {/* Card 2: Total Inflow */}
        <div className="relative overflow-hidden rounded-2xl border border-emerald-200/80 dark:border-emerald-900/50 bg-gradient-to-br from-emerald-500/10 via-slate-50 to-transparent dark:from-emerald-950/30 dark:via-slate-900 p-5 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Total Inflow (+)
            </span>
            <div className="h-9 w-9 rounded-xl bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center ring-1 ring-emerald-500/20">
              <ArrowDownLeft className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl lg:text-3xl font-extrabold tracking-tight text-emerald-700 dark:text-emerald-400 font-mono">
              ₹ {summary.total_inflow.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Fee collections + miscellaneous cash inflows
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-emerald-100 dark:border-emerald-900/40 flex items-center justify-between text-[11px] text-emerald-800 dark:text-emerald-300 font-medium">
            <span>{summary.fee_receipts_count} Fee Receipts</span>
            <span>+{summary.misc_income_count} Misc Incomes</span>
          </div>
        </div>

        {/* Card 3: Total Outflow */}
        <div className="relative overflow-hidden rounded-2xl border border-rose-200/80 dark:border-rose-900/50 bg-gradient-to-br from-rose-500/10 via-slate-50 to-transparent dark:from-rose-950/30 dark:via-slate-900 p-5 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
              Total Outflow (-)
            </span>
            <div className="h-9 w-9 rounded-xl bg-rose-500/15 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center ring-1 ring-rose-500/20">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl lg:text-3xl font-extrabold tracking-tight text-rose-600 dark:text-rose-400 font-mono">
              ₹ {summary.total_outflow.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Petty cash expenses + bank cash deposits
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-rose-100 dark:border-rose-900/40 flex items-center justify-between text-[11px] text-rose-800 dark:text-rose-300 font-medium">
            <span>{summary.expenses_count} Expenses</span>
            <span>{summary.bank_deposits_count} Bank Deposits</span>
          </div>
        </div>

        {/* Card 4: Closing Balance */}
        <div className="relative overflow-hidden rounded-2xl border-2 border-indigo-500/80 dark:border-indigo-500/80 bg-gradient-to-br from-indigo-500/15 via-indigo-500/5 to-transparent dark:from-indigo-950/50 dark:via-indigo-950/30 p-5 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
              Closing Balance (=)
            </span>
            <div className="h-9 w-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Coins className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl lg:text-3xl font-extrabold tracking-tight text-indigo-950 dark:text-indigo-100 font-mono">
              ₹ {summary.closing_balance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Net balance at end of period ({endDate})
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-indigo-100 dark:border-indigo-900/50 flex items-center justify-between text-[11px] font-semibold">
            <span className="text-slate-600 dark:text-slate-300">Net Period Change:</span>
            <span
              className={
                summary.net_change >= 0
                  ? "text-emerald-700 dark:text-emerald-400 font-bold"
                  : "text-rose-600 dark:text-rose-400 font-bold"
              }
            >
              {summary.net_change >= 0 ? "+" : ""}
              ₹ {summary.net_change.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* ─── Search & Transaction Type Pills ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 print:hidden">
        {/* Type Filter Pills */}
        <div className="inline-flex flex-wrap items-center gap-1.5 p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs">
          {[
            { id: "ALL", label: `All (${ledgerData?.transactions?.length || 0})` },
            { id: "FEE_RECEIPT", label: `Fee Receipts (${summary.fee_receipts_count})` },
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
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4 whitespace-nowrap">Date & Time</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Type</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Slip / Ref #</th>
                <th className="py-3.5 px-4 min-w-[260px]">Particulars / Source</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Recorded By</th>
                <th className="py-3.5 px-4 text-right whitespace-nowrap">Inflow (+)</th>
                <th className="py-3.5 px-4 text-right whitespace-nowrap">Outflow (-)</th>
                <th className="py-3.5 px-4 text-right whitespace-nowrap">Balance (=)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {/* Row 0: Opening Balance Line */}
              <tr className="bg-indigo-50/40 dark:bg-indigo-950/20 font-medium">
                <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300" colSpan={3}>
                  <div className="flex items-center gap-1.5">
                    <Wallet className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Prior to {startDate}</span>
                  </div>
                </td>
                <td className="py-3 px-4 font-semibold text-indigo-900 dark:text-indigo-200">
                  Opening Balance (Carried Forward)
                </td>
                <td className="py-3 px-4 text-slate-400">-</td>
                <td className="py-3 px-4 text-right text-slate-400">-</td>
                <td className="py-3 px-4 text-right text-slate-400">-</td>
                <td className="py-3 px-4 text-right font-mono font-bold text-indigo-900 dark:text-indigo-200">
                  ₹ {summary.opening_balance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>

              {/* Transaction Items */}
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="h-6 w-6 animate-spin text-indigo-600" />
                      <span className="text-sm">Fetching ledger records...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
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
                  const isIncome = tx.transaction_type === "MISC_INCOME";
                  const isExpense = tx.transaction_type === "EXPENSE";
                  const isDeposit = tx.transaction_type === "BANK_DEPOSIT";

                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
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
              <tr className="bg-slate-100 dark:bg-slate-800/90 font-bold border-t-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs">
                <td className="py-3.5 px-4" colSpan={5}>
                  <div className="flex items-center gap-2">
                    <span>Summary Totals ({filteredTransactions.length} records shown)</span>
                    <span className="text-slate-400 font-normal">|</span>
                    <span className="text-slate-600 dark:text-slate-400 font-normal">
                      Period: {startDate} to {endDate}
                    </span>
                  </div>
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
    </div>
  );
}
