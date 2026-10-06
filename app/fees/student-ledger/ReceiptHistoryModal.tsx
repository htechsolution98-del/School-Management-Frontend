"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  FileText,
  CalendarDays,
  IndianRupee,
  Search,
  Printer,
  ChevronRight,
  Receipt,
  X,
  Loader2,
  CheckCircle2,
  Building2,
  User,
  CreditCard,
} from "lucide-react";
import { fetchWithAuth } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";
import { formatBillingPeriod, formatCurrency, formatDisplayDate } from "@/lib/fees";
import type { Payment, Student } from "@/types/fees";

interface ReceiptGroup {
  receiptNumber: string;
  paymentDate: string;
  paymentMode: string;
  payerType: string;
  transactionId?: string | null;
  note?: string | null;
  totalAmount: number;
  items: Payment[];
}

export default function ReceiptHistoryModal({
  isOpen,
  onClose,
  student,
  onSelectReceipt,
}: {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  onSelectReceipt: (receiptNo: string, items: Payment[]) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!isOpen || !student) {
      setPayments([]);
      setSearchQuery("");
      return;
    }

    const loadStudentPayments = async () => {
      setLoading(true);
      try {
        const res = await fetchWithAuth(
          `${API_BASE_URL}/student-fee-payment/?student=${student.id}`
        );
        if (res.ok) {
          const data = await res.json();
          const list: Payment[] = Array.isArray(data) ? data : data.results || [];
          setPayments(list);
        }
      } catch (err) {
        console.error("Failed to load receipts", err);
      } finally {
        setLoading(false);
      }
    };

    loadStudentPayments();
  }, [isOpen, student]);

  // Group payments by receipt_number (or by unique transaction / id fallback)
  const receiptGroups = useMemo<ReceiptGroup[]>(() => {
    const map = new Map<string, Payment[]>();

    for (const p of payments) {
      const key = p.receipt_number?.trim() || `RCPT-SINGLE-${p.id}`;
      const group = map.get(key) || [];
      group.push(p);
      map.set(key, group);
    }

    const groups: ReceiptGroup[] = [];
    map.forEach((items, receiptNo) => {
      const first = items[0];
      const totalAmount = items.reduce(
        (sum, item) => sum + parseFloat(item.amount || "0"),
        0
      );

      groups.push({
        receiptNumber: receiptNo.startsWith("RCPT-SINGLE-")
          ? first.receipt_number || `#${first.id}`
          : receiptNo,
        paymentDate: first.payment_date || first.created_at || "",
        paymentMode: first.payment_mode || "cash",
        payerType: first.payer_type || (first.is_rte_govt_claim ? "government" : "student"),
        transactionId: first.transaction_id,
        note: first.note,
        totalAmount,
        items,
      });
    });

    // Sort newest receipts first
    return groups.sort((a, b) => {
      const dateA = new Date(a.paymentDate).getTime() || 0;
      const dateB = new Date(b.paymentDate).getTime() || 0;
      return dateB - dateA;
    });
  }, [payments]);

  // Filter receipt groups based on search
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return receiptGroups;
    const q = searchQuery.toLowerCase();
    return receiptGroups.filter((g) => {
      const matchNo = g.receiptNumber.toLowerCase().includes(q);
      const matchMode = g.paymentMode.toLowerCase().includes(q);
      const matchItems = g.items.some(
        (i) =>
          (i.feetype_name || "").toLowerCase().includes(q) ||
          (i.fee_billing_period || "").toLowerCase().includes(q)
      );
      return matchNo || matchMode || matchItems;
    });
  }, [receiptGroups, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-gray-100">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/30">
              <Receipt size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-gray-900">Student Receipts</h3>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
                  {receiptGroups.length} {receiptGroups.length === 1 ? "Receipt" : "Receipts"}
                </span>
              </div>
              {student && (
                <p className="text-xs text-gray-500 mt-0.5 font-medium">
                  {student.name} {student.surname} • GR No: {student.gr_no || "N/A"} • Class: {student.class_name || "N/A"}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-white flex items-center justify-center transition-colors shadow-sm"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by receipt number, fee name, month, payment mode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-xs font-semibold text-gray-500 hover:text-gray-800 px-2 py-1"
            >
              Clear
            </button>
          )}
        </div>

        {/* Body List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-gray-400">
              <Loader2 size={36} className="animate-spin text-blue-600 mb-2" />
              <p className="text-sm font-medium">Loading receipts...</p>
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-gray-400">
              <FileText size={44} className="opacity-30 mb-2" />
              <p className="text-base font-semibold text-gray-700">No Receipts Found</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {searchQuery ? "Try a different search query." : "No payments have been recorded for this student yet."}
              </p>
            </div>
          ) : (
            filteredGroups.map((g) => {
              const isBulk = g.items.length > 1;
              const isGovt = g.payerType === "government" || g.paymentMode === "govt_rte";

              return (
                <div
                  key={g.receiptNumber}
                  className="bg-white rounded-2xl border border-gray-200/90 shadow-sm hover:shadow-md hover:border-blue-300 transition-all overflow-hidden"
                >
                  <div className="p-4 bg-gray-50/70 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-100">
                        {g.receiptNumber}
                      </span>
                      {isBulk && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 border border-purple-200">
                          Bulk ({g.items.length} Fees)
                        </span>
                      )}
                      {isGovt ? (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center gap-1">
                          🏛️ RTE Govt Claim
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 flex items-center gap-1">
                          <User size={11} /> Student Payment
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1 font-medium">
                        <CalendarDays size={13} className="text-gray-400" />
                        {formatDisplayDate(g.paymentDate)}
                      </span>
                      <span className="capitalize font-semibold text-gray-700 bg-white px-2 py-0.5 rounded border border-gray-200">
                        {g.paymentMode.replace(/_/g, " ")}
                      </span>
                    </div>
                  </div>

                  {/* Receipt Items Breakdown Table */}
                  <div className="p-4">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-gray-100 text-gray-400 font-semibold uppercase tracking-wider text-[10px]">
                            <th className="pb-2">#</th>
                            <th className="pb-2">Fee Description</th>
                            <th className="pb-2 text-right">Base Fee</th>
                            <th className="pb-2 text-right">Late Fee</th>
                            <th className="pb-2 text-right">Discount</th>
                            <th className="pb-2 text-right font-bold text-gray-700">Paid Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {g.items.map((item, idx) => (
                            <tr key={item.id || idx} className="hover:bg-gray-50/50">
                              <td className="py-2.5 text-gray-400 font-mono">{idx + 1}</td>
                              <td className="py-2.5">
                                <span className="font-semibold text-gray-900">{item.feetype_name}</span>
                                {item.fee_billing_period && (
                                  <span className="text-gray-500 text-[11px] ml-1.5">
                                    • {formatBillingPeriod(item.fee_billing_period)}
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 text-right text-gray-600">
                                {formatCurrency(item.fee_amount || 0)}
                              </td>
                              <td className="py-2.5 text-right text-orange-600">
                                {parseFloat(item.fee_penalty || "0") > 0
                                  ? `+${formatCurrency(item.fee_penalty || "0")}`
                                  : "₹0"}
                              </td>
                              <td className="py-2.5 text-right text-green-600">
                                {parseFloat(item.fee_discount || "0") > 0
                                  ? `-${formatCurrency(item.fee_discount || "0")}`
                                  : "₹0"}
                              </td>
                              <td className="py-2.5 text-right font-bold text-gray-900">
                                {formatCurrency(item.amount || 0)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Footer with Total and Print Button */}
                    <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
                      <div className="text-xs text-gray-500">
                        {g.transactionId && (
                          <span className="mr-3">
                            Ref/Txn: <strong className="text-gray-700">{g.transactionId}</strong>
                          </span>
                        )}
                        {g.note && (
                          <span>
                            Note: <span className="italic text-gray-600">"{g.note}"</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="text-[10px] uppercase text-gray-400 font-bold block">
                            Receipt Grand Total
                          </span>
                          <span className="text-base font-extrabold text-blue-700">
                            {formatCurrency(g.totalAmount)}
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            onClose();
                            onSelectReceipt(g.receiptNumber, g.items);
                          }}
                          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                        >
                          <Printer size={14} /> View / Print Receipt
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
