"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Printer,
  Receipt,
  CheckCircle2,
  AlertCircle,
  Building2,
  Mail,
  Phone,
  Calendar,
  BookOpen,
  User,
  CreditCard,
  DollarSign,
  ShieldCheck,
  Hash,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FinePaymentResult, BookIssued } from "@/lib/library";

interface LibraryFineReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receiptData: FinePaymentResult | null;
}

function getSchoolInitials(name?: string): string {
  if (!name) return "SL";
  const words = name
    .trim()
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

export function LibraryFineReceiptModal({
  isOpen,
  onClose,
  receiptData,
}: LibraryFineReceiptModalProps) {
  const [logoError, setLogoError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    setLogoError(false);
    setImageLoaded(false);
  }, [receiptData]);

  if (!isOpen || !receiptData) return null;

  const record: BookIssued | undefined = receiptData.record;
  const schoolInfo = record?.school_info;

  const schoolName =
    record?.school_name ||
    schoolInfo?.name ||
    "Institution Library";

  const rawLogo = record?.school_logo || schoolInfo?.logo;
  const schoolLogo = rawLogo && typeof rawLogo === "string" && rawLogo.trim() !== "" ? rawLogo.trim() : null;

  const schoolAddress =
    record?.school_address ||
    schoolInfo?.address ||
    "Campus Library Management";

  const schoolPhone = record?.school_phone || schoolInfo?.phone;
  const schoolEmail = record?.school_email || schoolInfo?.email;
  const schoolCode = record?.school_code || schoolInfo?.code;

  const borrowerName =
    record?.staff_name ||
    record?.student_name ||
    "Borrower";

  const isStaff = record?.borrower_type === "staff" || !!record?.staff;
  const grNumber = record?.student_gr_no;
  const studentClass = record?.student_class;
  const studentDivision = record?.student_division;
  const bookTitle = record?.book_title || "Library Book";
  const accessionNo = record?.accession_no;
  const returnCondition = record?.condition_on_return || record?.status || "RETURNED";
  const paymentMethod = record?.payment_method || "Cash";
  const isPaid = receiptData.is_fine_paid || Number(receiptData.remaining_due || 0) <= 0;

  const totalFine = Number(record?.total_fine || receiptData.amount_paid || 0);
  const damageFee = Number(record?.damage_fees || 0);
  const lateFee = Number(record?.late_fees || 0);
  const lostFee = Number(record?.lost_fees || 0);
  const amountPaid = Number(receiptData.amount_paid || 0);
  const remainingDue = Number(receiptData.remaining_due || 0);

  const paymentDateStr = record?.payment_date
    ? new Date(record.payment_date).toLocaleString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : new Date().toLocaleString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4 overflow-y-auto receipt-modal-wrapper">
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-fine-receipt, #printable-fine-receipt * {
            visibility: visible !important;
          }
          #printable-fine-receipt {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 24px !important;
            background: #ffffff !important;
            color: #0f172a !important;
            box-shadow: none !important;
            border: 1px solid #cbd5e1 !important;
            border-radius: 8px !important;
            z-index: 999999 !important;
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }
          .receipt-no-print {
            display: none !important;
          }
          .receipt-print-only {
            display: block !important;
          }
        }
      `}</style>

      <div
        className="relative bg-white rounded-none sm:rounded-2xl shadow-2xl w-full max-w-xl h-[100dvh] sm:h-auto sm:max-h-[92vh] flex flex-col overflow-hidden border-0 sm:border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar (Modal UI Only) */}
        <div className="receipt-no-print flex items-center justify-between px-4 sm:px-5 py-3 sm:py-3.5 border-b border-slate-200 bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={onClose}
              className="sm:hidden p-1.5 -ml-1 text-slate-700 hover:text-slate-900 rounded-xl hover:bg-slate-200/50 transition-colors cursor-pointer shrink-0"
              title="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="h-7 w-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0">
              <Receipt className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-900 leading-tight truncate">
                Library Fine Payment Receipt
              </h2>
              <p className="text-[11px] text-slate-500 font-mono truncate">
                {receiptData.receipt_no}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="hidden sm:flex text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-200/50 transition-colors cursor-pointer"
            title="Close Receipt"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Printable Receipt Paper Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/40">
          <div
            id="printable-fine-receipt"
            className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4 text-slate-800"
          >
            {/* Header: Logo, School Name, Contact & Receipt Meta */}
            <div className="border-b-2 border-slate-900 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                {/* Left: Dynamic School Logo & Details */}
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  {/* Dynamic Logo with Fallback */}
                  {schoolLogo && !logoError ? (
                    <div className="relative h-14 w-14 sm:h-16 sm:w-16 rounded-xl border border-slate-200 overflow-hidden bg-white p-1 shrink-0 shadow-2xs flex items-center justify-center">
                      <img
                        src={schoolLogo}
                        alt={`${schoolName} Logo`}
                        crossOrigin="anonymous"
                        className={`h-full w-full object-contain transition-opacity duration-200 ${
                          imageLoaded ? "opacity-100" : "opacity-90"
                        }`}
                        onLoad={() => setImageLoaded(true)}
                        onError={() => {
                          console.warn("Failed to load school logo:", schoolLogo);
                          setLogoError(true);
                        }}
                      />
                    </div>
                  ) : (
                    <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900 text-white font-extrabold flex flex-col items-center justify-center shrink-0 shadow-sm border border-indigo-900/20">
                      <span className="text-base sm:text-lg tracking-wider font-mono">
                        {getSchoolInitials(schoolName)}
                      </span>
                      <span className="text-[8px] uppercase tracking-widest font-semibold opacity-80">
                        Library
                      </span>
                    </div>
                  )}

                  {/* School Info Block */}
                  <div className="min-w-0 flex-1">
                    <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-snug break-words">
                      {schoolName}
                    </h1>
                    {schoolCode && (
                      <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded-md inline-block mt-0.5">
                        Code: {schoolCode}
                      </span>
                    )}
                    {schoolAddress && (
                      <p className="text-[11px] text-slate-600 mt-0.5 leading-tight break-words">
                        {schoolAddress}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-slate-500 mt-1 font-medium">
                      {schoolPhone && (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-2.5 w-2.5 text-slate-400" /> {schoolPhone}
                        </span>
                      )}
                      {schoolEmail && (
                        <span className="inline-flex items-center gap-1">
                          <Mail className="h-2.5 w-2.5 text-slate-400" /> {schoolEmail}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Receipt Title & Meta */}
                <div className="text-left sm:text-right shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 sm:border-none">
                  <div className="inline-block bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                    Official Library Receipt
                  </div>
                  <div className="mt-1">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block sm:inline">
                      Receipt No:{" "}
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-900">
                      {receiptData.receipt_no}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                    {paymentDateStr}
                  </div>
                  <div className="mt-1">
                    {isPaid ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" />
                        Fully Paid
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-300 px-2 py-0.5 rounded-full">
                        <AlertCircle className="h-2.5 w-2.5 text-rose-600" />
                        Due: ₹{remainingDue.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Borrower & Circulation Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50/70 p-3.5 rounded-xl border border-slate-200">
              <div className="space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Borrower Details
                </div>
                <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                  <span className="truncate">{borrowerName}</span>
                </div>
                <div className="text-[11px] text-slate-600">
                  {isStaff ? (
                    <span className="font-semibold text-slate-700">Staff Member</span>
                  ) : (
                    <span>
                      {studentClass ? `Class: ${studentClass}` : ""}
                      {studentDivision ? ` - Div: ${studentDivision}` : ""}
                    </span>
                  )}
                  {grNumber && (
                    <span className="ml-2 font-mono font-semibold text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                      GR: {grNumber}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-1 sm:border-l sm:pl-3 border-slate-200">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Book Loan Record
                </div>
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                  <span className="truncate">{bookTitle}</span>
                </div>
                <div className="text-[11px] text-slate-600 flex items-center gap-2">
                  <span>Accession:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {accessionNo || "—"}
                  </span>
                  <span className="text-slate-300">|</span>
                  <span
                    className={`font-semibold px-1.5 py-0.2 rounded text-[10px] ${
                      returnCondition === "GOOD"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700 font-bold"
                    }`}
                  >
                    {returnCondition}
                  </span>
                </div>
              </div>
            </div>

            {/* Assessment & Settlement Statement */}
            <div className="space-y-2 text-xs">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Fee Assessment Breakdown & Payment Settlement
              </div>

              <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-50 text-slate-600 text-[11px] font-bold uppercase border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2">Description / Reason</th>
                    <th className="px-3 py-2 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {damageFee > 0 && (
                    <tr>
                      <td className="px-3 py-2 text-slate-700 font-medium">
                        Book Physical Damage Penalty
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-semibold text-slate-900">
                        ₹{damageFee.toFixed(2)}
                      </td>
                    </tr>
                  )}
                  {lateFee > 0 && (
                    <tr>
                      <td className="px-3 py-2 text-slate-700 font-medium">
                        Late Overdue Loan Fine
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-semibold text-slate-900">
                        ₹{lateFee.toFixed(2)}
                      </td>
                    </tr>
                  )}
                  {lostFee > 0 && (
                    <tr>
                      <td className="px-3 py-2 text-slate-700 font-medium">
                        Lost Book Replacement Penalty
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-semibold text-slate-900">
                        ₹{lostFee.toFixed(2)}
                      </td>
                    </tr>
                  )}
                  {damageFee <= 0 && lateFee <= 0 && lostFee <= 0 && (
                    <tr>
                      <td className="px-3 py-2 text-slate-700 font-medium">
                        Library Fine Assessment
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-semibold text-slate-900">
                        ₹{totalFine.toFixed(2)}
                      </td>
                    </tr>
                  )}
                  <tr className="bg-slate-50/70 font-semibold border-t">
                    <td className="px-3 py-2 text-slate-800">Total Assessed Fine</td>
                    <td className="px-3 py-2 text-right font-mono font-bold text-slate-900">
                      ₹{totalFine.toFixed(2)}
                    </td>
                  </tr>
                  <tr className="bg-emerald-50/60 font-bold border-t border-emerald-200">
                    <td className="px-3 py-2.5 text-emerald-950 flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Amount Received & Settled ({paymentMethod})</span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-sm text-emerald-800">
                      ₹{amountPaid.toFixed(2)}
                    </td>
                  </tr>
                  {remainingDue > 0 && (
                    <tr className="bg-rose-50/60 font-bold text-rose-800 border-t border-rose-200">
                      <td className="px-3 py-2">Remaining Balance Due</td>
                      <td className="px-3 py-2 text-right font-mono text-sm">
                        ₹{remainingDue.toFixed(2)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Payment Details Pill & Remarks */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs pt-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-500">Payment Mode:</span>
                <span className="inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200 text-xs">
                  {paymentMethod.toLowerCase() === "cash" ? (
                    <DollarSign className="h-3 w-3 text-emerald-600" />
                  ) : (
                    <CreditCard className="h-3 w-3 text-indigo-600" />
                  )}
                  {paymentMethod}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                Transaction Ref: {receiptData.receipt_no}
              </div>
            </div>

            {/* Footer Signatures & Official Notice */}
            <div className="pt-6 border-t border-slate-200 space-y-4">
              <div className="flex justify-between items-end text-xs pt-3">
                <div className="text-left space-y-1">
                  <div className="h-9 w-28 border-b border-dashed border-slate-300"></div>
                  <span className="text-[10px] font-semibold text-slate-500 block">
                    Receiver / Student
                  </span>
                </div>
                <div className="text-right space-y-1">
                  <div className="h-9 w-36 border-b border-dashed border-slate-400"></div>
                  <span className="text-[10px] font-bold text-slate-700 block">
                    Authorized Library Signatory
                  </span>
                  <span className="text-[9px] text-slate-400 block font-mono">
                    {schoolName} Library Counter
                  </span>
                </div>
              </div>

              <div className="text-center text-[10px] text-slate-400 leading-tight pt-2 border-t border-slate-100">
                This is a computer-generated official library fine receipt issued under institutional library regulations.
              </div>
            </div>
          </div>
        </div>

        {/* Modal Action Buttons (Hidden during Print) */}
        <div className="receipt-no-print p-4 border-t border-slate-200 bg-white flex items-center justify-end gap-2.5 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs font-semibold"
          >
            Close
          </Button>
          <Button
            type="button"
            onClick={handlePrint}
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-sm"
          >
            <Printer className="h-3.5 w-3.5" /> Print / Save PDF
          </Button>
        </div>
      </div>
    </div>
  );
}
