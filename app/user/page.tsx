"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Script from "next/script";
import { toast } from "sonner";
import {
  User,
  Loader2,
  ArrowRight,
  ArrowLeft,
  GraduationCap,
  CreditCard,
  CheckCircle2,
  Upload,
  Sparkles,
  Shield,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import {
  getTempUsers,
  getPublicFormFields,
  createSubmission,
  updateSubmission,
  getClasses,
  createRazorOrder,
  verifyRazorPayment,
  createOfflinePayment,
  getAdmissionReceipt,
  submitDocuments,
} from "@/lib/user";

// ────────────────────────────────────────────
// Static Data
// ─────────────────────────────────────────────

const PARENT_NAME = "Future Student";

const STEPS = [
  {
    id: 1,
    label: "Student Details",
    icon: User,
    title: "Student Details",
    desc: "Fill in the primary details for admission.",
  },
  {
    id: 2,
    label: "Documents",
    icon: Upload,
    title: "Upload Documents",
    desc: "Upload scans (PDF/JPG, max 5 MB each).",
  },
  {
    id: 3,
    label: "Review & Pay",
    icon: CreditCard,
    title: "Review & Submit",
    desc: "Everything looks good! Finalize your payment below.",
  },
];

// ─────────────────────────────────────────────
// Root
// ─────────────────────────────────────────────

export default function AdmissionPortal() {
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<any>(null);
  const [selectedChild, setSelectedChild] = useState<null | any>(null);

  const fetchData = async () => {
    try {
      const data = await getTempUsers();
      const formattedData = data.map((item: any) => ({
        id: item.admission_number,
        admission_number: item.admission_number,
        name:
          (() => {
            const allFieldValues = item.sections?.flatMap((s: any) => s?.field_values ?? []) ?? [];
            const nameField = allFieldValues.find(
              (f: any) =>
                f.field_label?.toLowerCase().includes("name") ||
                f.field_name?.toLowerCase().includes("name")
            );
            return nameField?.value || allFieldValues[0]?.value || "Student";
          })(),
        grade: item.form_title ?? `Form ${item.form}`,
        status: item.status,
        fee_data: item.fee_data ?? null,
        pay_process: item.pay_process ?? false,
        lastUpdated: "Recently",
        progress:
          item.pay_process && item.fee_data?.paid_at
            ? 100
            : item.sections?.some((s: any) => s?.field_values?.length > 0)
              ? 65
              : 35,
        sections: item.sections,
      }));
      setChildren(formattedData);
      const formResponse = await getPublicFormFields();
      setFormData(formResponse);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleBack = async () => {
    setSelectedChild(null);
    await fetchData();
  };

  const handlePaymentSuccess = (paidAdmissionNumber: string) => {
    setChildren((prev) =>
      prev.map((c) =>
        c.admission_number === paidAdmissionNumber
          ? {
            ...c,
            fee_data: {
              amount: 0,
              payment_mode: "online",
              paid_at: new Date().toISOString(),
            },
            pay_process: true,
            progress: 100,
          }
          : c,
      ),
    );

    setSelectedChild(null);

    setTimeout(async () => {
      try {
        const data = await getTempUsers();
        const formattedData = data.map((item: any) => ({
          id: item.admission_number,
          admission_number: item.admission_number,
          name:
            (() => {
              const allFieldValues = item.sections?.flatMap((s: any) => s?.field_values ?? []) ?? [];
              const nameField = allFieldValues.find(
                (f: any) =>
                  f.field_label?.toLowerCase().includes("name") ||
                  f.field_name?.toLowerCase().includes("name")
              );
              return nameField?.value || allFieldValues[0]?.value || "Student";
            })(),
          grade: `Form ${item.form}`,
          status: item.status,
          fee_data: item.fee_data ?? null,
          pay_process: item.pay_process ?? false,
          lastUpdated: "Recently",
          progress:
            item.pay_process && item.fee_data?.paid_at
              ? 100
              : item.sections?.some((s: any) => s?.field_values?.length > 0)
                ? 65
                : 35,
          sections: item.sections,
        }));
        setChildren(formattedData);
      } catch (error) {
        console.log(error);
      }
    }, 1500);
  };

  return (
    <div
      className={`w-full bg-slate-50 flex flex-col font-sans ${selectedChild ? "h-screen overflow-hidden" : "min-h-screen"}`}
    >
      <AnimatePresence mode="wait">
        {!selectedChild ? (
          loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 min-h-screen flex flex-col items-center justify-center gap-5"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              >
                <Loader2 className="h-10 w-10 text-indigo-400" />
              </motion.div>
              <p className="text-slate-400 font-bold text-sm">
                Loading applications…
              </p>
            </motion.div>
          ) : (
            <ChildrenList
              key="list"
              onSelect={setSelectedChild}
              children={children}
              formData={formData}
            />
          )
        ) : (
          <MultiStepForm
            key="form"
            child={selectedChild}
            formData={formData}
            onBack={handleBack}
            onPaymentSuccess={handlePaymentSuccess}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────
// Avatar color palette
// ─────────────────────────────────────────────
const AVATAR_COLORS = [
  {
    bg: "bg-indigo-600",
    light: "bg-indigo-100",
    text: "text-indigo-600",
    bar: "bg-indigo-600",
    glow: "rgba(99,102,241,0.18)",
  },
];

const STATUS_STYLES: Record<string, string> = {
  Incomplete: "bg-amber-50 text-amber-600 border border-amber-200",
  "Action Required": "bg-rose-50 text-rose-600 border border-rose-200",
  "Under Review": "bg-emerald-50 text-emerald-600 border border-emerald-200",
  Submitted: "bg-indigo-50 text-indigo-600 border border-indigo-200",
  pending: "bg-amber-50 text-amber-600 border border-amber-200",
  completed: "bg-emerald-50 text-emerald-600 border border-emerald-200",
};

const generateReceiptPDF = (data: any) => {
  import("jspdf").then(({ default: jsPDF }) => {
    import("jspdf-autotable").then(({ default: autoTable }) => {
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
          : "—";

      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("SCHOOL ADMISSION FORM", pageW / 2, 18, { align: "center" });
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text(data.form_title ?? "", pageW / 2, 25, { align: "center" });

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.rect(55, 30, 100, 9);
      doc.text("ADMISSION RECEIPT", pageW / 2, 37, { align: "center" });

      doc.setFontSize(9.5);
      let y = 48;
      const gap = 7;
      const col2 = 70, col3 = 115, col4 = 148;

      const row = (l1: string, v1: string, l2?: string, v2?: string) => {
        doc.setFont("helvetica", "bold");
        doc.text(l1, left, y);
        doc.setFont("helvetica", "normal");
        doc.text(`: ${v1}`, col2, y);
        if (l2 && v2) {
          doc.setFont("helvetica", "bold");
          doc.text(l2, col3, y);
          doc.setFont("helvetica", "normal");
          doc.text(`: ${v2}`, col4, y);
        }
        y += gap;
      };

      row("Admission Number", data.admission_number ?? "", "Form Title", data.form_title ?? "");
      row("Status", data.status ? data.status.charAt(0).toUpperCase() + data.status.slice(1) : "");
      row("Pay Process", data.pay_process ? "Yes" : "No", "Username", data.temp_user_data?.username ?? "");
      row("Fee Amount", data.fee_amount ? `Rs. ${parseFloat(data.fee_amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—", "Email", data.temp_user_data?.email ?? "");
      row("Submitted At", fmt(data.submitted_at), "Mobile", data.temp_user_data?.mobile ?? "");

      doc.line(left, y, pageW - left, y);
      y += 6;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("STUDENT DETAILS", pageW / 2, y, { align: "center" });
      y += 3;

      autoTable(doc, {
        startY: y,
        head: [["Student Information", "Details"]],
        body: (data.field_values ?? []).map((f: any) => [f.field_name ?? "", f.value ?? ""]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [255, 255, 255], textColor: 0, fontStyle: "bold", lineWidth: 0.3 },
        columnStyles: { 0: { cellWidth: 70 }, 1: { cellWidth: "auto" } },
        theme: "grid",
      });

      y = (doc as any).lastAutoTable.finalY + 8;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("UPLOADED DOCUMENTS", pageW / 2, y, { align: "center" });
      y += 3;

      autoTable(doc, {
        startY: y,
        head: [["S.No.", "Document Name", "Uploaded At"]],
        body: (data.documents ?? []).map((d: any, i: number) => [i + 1, d.document_name ?? "", fmt(d.uploaded_at)]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [255, 255, 255], textColor: 0, fontStyle: "bold", lineWidth: 0.3 },
        columnStyles: { 0: { cellWidth: 15 }, 1: { cellWidth: 100 }, 2: { cellWidth: "auto" } },
        theme: "grid",
      });

      y = (doc as any).lastAutoTable.finalY + 8;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("PAYMENT DETAILS", pageW / 2, y, { align: "center" });
      y += 3;

      const pd = data.payment_detail ?? {};
      autoTable(doc, {
        startY: y,
        body: [
          ["Payment ID", String(pd.id ?? "—")],
          ["Amount", pd.amount ? `Rs. ${Number(pd.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—"],
          ["Currency", pd.currency ?? "INR"],
          ["Payment Mode", pd.payment_mode ? pd.payment_mode.charAt(0).toUpperCase() + pd.payment_mode.slice(1) : "—"],
          ["Payment Type", pd.payment_type ? pd.payment_type.charAt(0).toUpperCase() + pd.payment_type.slice(1) : "—"],
          ["Razorpay Order ID", pd.razorpay_order_id ?? "—"],
          ["Razorpay Payment ID", pd.razorpay_payment_id ?? "—"],
          ["Fee Verify", pd.fee_verify ? "Yes" : "No"],
          ["Created At", fmt(pd.created_at)],
          ["Paid At", fmt(pd.paid_at)],
        ],
        styles: { fontSize: 9 },
        columnStyles: { 0: { fontStyle: "bold", cellWidth: 58 } },
        theme: "grid",
      });

      y = (doc as any).lastAutoTable.finalY + 16;

      doc.setFontSize(9.5);
      doc.line(left, y, left + 60, y);
      doc.line(pageW - left - 60, y, pageW - left, y);
      y += 5;
      doc.text("Parent / Guardian Signature", left, y);
      doc.text("Authorized Signature", pageW - left - 60, y);

      doc.save(`receipt-${data.admission_number}.pdf`);
    });
  });
};

// ─────────────────────────────────────────────
// ChildrenList
// ─────────────────────────────────────────────
function ChildrenList({
  onSelect,
  children,
  formData,
}: {
  onSelect: (c: any) => void;
  children: any[];
  formData?: any;
}) {
  const [receiptChild, setReceiptChild] = useState<any>(null);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);

  const handleReceiptOpen = async (child: any) => {
    setReceiptChild(child);
    setReceiptData(null);
    setReceiptLoading(true);
    try {
      const data = await getAdmissionReceipt(child.admission_number);
      setReceiptData(data[0] ?? data);
    } catch (error) {
      console.log(error);
    } finally {
      setReceiptLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex-1 w-full"
    >
      {/* ── RECEIPT MODAL ── */}
      <AnimatePresence>
        {receiptChild && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setReceiptChild(null);
                setReceiptData(null);
              }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            />

            {/* Modal — MOBILE FIX: bottom sheet on mobile, centered on desktop */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 24 }}
              transition={{ type: "spring", stiffness: 280, damping: 24 }}
              className="fixed inset-x-0 bottom-0 sm:inset-0 z-50 flex sm:items-center sm:justify-center sm:px-4"
            >
              <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-md overflow-hidden max-h-[92vh] flex flex-col">
                {/* Drag handle on mobile */}
                <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
                  <div className="w-10 h-1 bg-slate-200 rounded-full" />
                </div>

                {/* Modal header */}
                <div className="relative overflow-hidden bg-gradient-to-r from-emerald-500 to-teal-500 px-5 sm:px-7 py-5 sm:py-6 text-white shrink-0">
                  <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/10" />
                  <div className="absolute right-10 -bottom-8 w-20 h-20 rounded-full bg-white/10" />
                  <div className="relative flex items-center gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-2xl flex items-center justify-center border border-white/30 shrink-0">
                      <CheckCircle2 size={22} className="text-white" />
                    </div>
                    <div>
                      <p className="font-black text-base sm:text-lg leading-tight">
                        Payment Confirmed!
                      </p>
                      <p className="text-emerald-100 text-xs font-medium mt-0.5">
                        Admission fee received successfully
                      </p>
                    </div>
                  </div>
                </div>

                {/* Scrollable content */}
                <div className="px-5 sm:px-7 py-5 sm:py-6 space-y-4 overflow-y-auto flex-1">
                  {receiptLoading ? (
                    <div className="flex items-center justify-center py-10">
                      <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                    </div>
                  ) : receiptData ? (
                    <>
                      {/* Student info */}
                      <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            Student
                          </span>
                          <span className="text-sm font-black text-slate-800 text-right ml-2">
                            {receiptData.field_values?.find(
                              (f: any) => f.field_name?.toLowerCase().includes("name"),
                            )?.value || receiptChild?.name}
                          </span>
                        </div>
                        <div className="h-px bg-slate-200" />
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            Admission No.
                          </span>
                          <span className="text-sm font-black text-indigo-600 font-mono text-right ml-2 break-all">
                            {receiptData.admission_number}
                          </span>
                        </div>
                        <div className="h-px bg-slate-200" />
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            Form
                          </span>
                          <span className="text-sm font-black text-slate-800 text-right ml-2">
                            {receiptData.form_title}
                          </span>
                        </div>
                        <div className="h-px bg-slate-200" />
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            Amount Paid
                          </span>
                          <span className="text-sm font-black text-emerald-600 text-right ml-2">
                            ₹{Number(receiptData.payment_detail?.amount).toLocaleString("en-IN")}{" "}
                            {receiptData.payment_detail?.currency}
                          </span>
                        </div>
                        <div className="h-px bg-slate-200" />
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0">
                            Payment Mode
                          </span>
                          <span className="text-xs font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                            {receiptData.payment_detail?.payment_mode}
                          </span>
                        </div>
                        <div className="h-px bg-slate-200" />
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0">
                            Paid At
                          </span>
                          <span className="text-xs font-bold text-slate-600 text-right ml-2">
                            {receiptData.payment_detail?.paid_at
                              ? new Date(receiptData.payment_detail.paid_at).toLocaleString("en-IN")
                              : "—"}
                          </span>
                        </div>
                        <div className="h-px bg-slate-200" />
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0">
                            Status
                          </span>
                          <span className="text-xs font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                            ✓ Paid
                          </span>
                        </div>
                        {receiptData.payment_detail?.razorpay_payment_id && (
                          <>
                            <div className="h-px bg-slate-200" />
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0">
                                Payment ID
                              </span>
                              <span className="text-xs font-mono text-slate-500 text-right ml-2 break-all">
                                {receiptData.payment_detail.razorpay_payment_id}
                              </span>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Documents */}
                      {receiptData.documents?.length > 0 && (
                        <div className="bg-slate-50 rounded-2xl p-4 space-y-2">
                          <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                            Documents Submitted
                          </p>
                          {receiptData.documents.map((doc: any) => (
                            <div key={doc.id} className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold text-slate-700 flex-1 min-w-0 truncate">
                                {doc.document_name}
                              </span>
                              <a
                                href={doc.file}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-indigo-600 font-bold hover:underline shrink-0"
                              >
                                View
                              </a>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Info note */}
                      <div className="flex items-start gap-3 bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-3">
                        <Shield size={15} className="text-indigo-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-indigo-600 font-medium leading-relaxed">
                          Your official receipt has been generated. Download it
                          for your records or collect it from the school office.
                        </p>
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-3 pt-1 pb-safe">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setReceiptChild(null);
                            setReceiptData(null);
                          }}
                          className="flex-1 rounded-2xl h-11 font-bold border-slate-200 text-slate-600 hover:bg-slate-50 text-sm"
                        >
                          Close
                        </Button>
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.97 }}
                          className="flex-1"
                        >
                          <Button
                            onClick={() => {
                              generateReceiptPDF(receiptData);
                              setTimeout(() => {
                                setReceiptChild(null);
                                setReceiptData(null);
                              }, 500);
                            }}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl h-11 font-bold shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 text-sm transition-all"
                          >
                            <svg
                              width="15"
                              height="15"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                            </svg>
                            Download
                          </Button>
                        </motion.div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 text-slate-400 text-sm font-medium">
                      Failed to load receipt.
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="w-full px-4 sm:px-6 md:px-10 pt-6 sm:pt-8 pb-5 sm:pb-6 border-b border-slate-100 bg-white"
      >
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-5">
          <div>
            {/* School Info Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-wrap items-center gap-2 mb-3"
            >
              <span className="inline-flex items-center gap-2 text-xs font-black capitalize tracking-wider text-white bg-gradient-to-r from-blue-600 to-indigo-600 px-3.5 py-1.5 rounded-full shadow-md shadow-indigo-100">
                <GraduationCap size={15} />
                <span>
                  {formData?.[0]?.school_name ||
                    formData?.school_name ||
                    (typeof window !== "undefined"
                      ? localStorage.getItem("school_name") ||
                        (localStorage.getItem("school_slug") || "").replace(/-/g, " ")
                      : "") ||
                    "School Admission Portal"}
                </span>
              </span>

              {(formData?.[0]?.title || formData?.title) ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  {formData?.[0]?.title || formData?.title}
                </span>
              ) : null}
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight"
            >
              Welcome back,{" "}
              <motion.span
                className="text-indigo-600 inline-block"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, duration: 0.4 }}
              >
                {PARENT_NAME}!
              </motion.span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35, duration: 0.4 }}
              className="text-slate-500 mt-1.5 text-sm sm:text-base font-medium"
            >
              Applying for admission at{" "}
              <strong className="text-slate-800 font-bold capitalize">
                {formData?.[0]?.school_name ||
                  formData?.school_name ||
                  (typeof window !== "undefined"
                    ? localStorage.getItem("school_name") ||
                      (localStorage.getItem("school_slug") || "").replace(/-/g, " ")
                    : "") ||
                  "your selected school"}
              </strong>
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25, duration: 0.4 }}
            className="flex gap-3 shrink-0"
          >
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} className="w-full sm:w-auto">
              <Button
                onClick={() =>
                  onSelect({
                    id: `NEW-${Date.now()}`,
                    name: "New Student",
                    grade: "Form 1",
                    status: "Incomplete",
                    lastUpdated: "Just now",
                    progress: 0,
                  })
                }
                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl h-11 px-5 font-bold shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 transition-all"
              >
                New Application <ArrowRight size={15} />
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>

      {/* Summary stats */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.35 }}
        className="w-full px-4 sm:px-6 md:px-10 py-3.5 bg-slate-50/60 border-b border-slate-100"
      >
        <div className="flex items-center gap-8 text-sm font-semibold text-slate-500">
          <span>
            <motion.span
              className="text-slate-900 font-black text-lg mr-1 tabular-nums"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {children.length}
            </motion.span>
            Active Applications
          </span>
        </div>
      </motion.div>

      {/* Cards */}
      <div className="w-full px-4 sm:px-6 md:px-10 py-4 sm:py-6 space-y-3">
        {children.map((child, i) => {
          const color = AVATAR_COLORS[i % AVATAR_COLORS.length];
          const badgeClass =
            STATUS_STYLES[child.status] ??
            "bg-slate-100 text-slate-500 border border-slate-200";
          const isPaid =
            child.pay_process === true && !!child.fee_data?.paid_at;

          return (
            <motion.div
              key={`${child.id}-${i}`}
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                delay: i * 0.08 + 0.35,
                duration: 0.45,
                ease: [0.22, 1, 0.36, 1],
              }}
              whileHover={{
                y: -4,
                scale: 1.005,
                boxShadow: `0 20px 60px -12px ${color.glow}, 0 4px 16px -4px rgba(0,0,0,0.06)`,
                borderColor: isPaid ? "rgba(16,185,129,0.2)" : "rgba(99,102,241,0.2)",
              }}
              whileTap={{ scale: 0.995 }}
              onClick={() => {
                if (isPaid) {
                  handleReceiptOpen(child);
                  return;
                }
                const hasData = child?.sections?.some(
                  (s: any) => s?.field_values?.length > 0,
                );
                onSelect({ ...child, currentStep: hasData ? 2 : 1 });
              }}
              className={`group bg-white border rounded-3xl p-4 sm:p-5 cursor-pointer transition-colors duration-300 shadow-sm ${isPaid ? "border-emerald-200" : "border-slate-200"}`}
              style={{ willChange: "transform" }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                {/* Top row on mobile: avatar + info + badge */}
                <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: i * 0.08 + 0.5, type: "spring", stiffness: 300 }}
                    className={`shrink-0 w-11 h-11 sm:w-12 sm:h-12 ${isPaid ? "bg-emerald-500" : color.bg} rounded-2xl flex items-center justify-center shadow-lg`}
                  >
                    {isPaid ? (
                      <CheckCircle2 size={20} className="text-white" />
                    ) : (
                      <User size={22} className="text-white" />
                    )}
                  </motion.div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-700 transition-colors truncate">
                        {child.name}
                      </h3>
                      <motion.span
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.08 + 0.55 }}
                        className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${badgeClass}`}
                      >
                        {child.status}
                      </motion.span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-400 text-xs font-semibold">
                      <span className="flex items-center gap-1.5">
                        <GraduationCap size={13} /> {child.grade}
                      </span>
                      <span className="font-mono text-[11px] text-slate-300 hidden sm:block truncate">
                        {child.id}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Progress bar — hidden on mobile (shown below), visible on desktop */}
                <div className="hidden lg:block w-52 shrink-0">
                  <div className="flex justify-between text-[11px] font-bold text-slate-400 mb-2">
                    <span>Application Progress</span>
                    <motion.span
                      className={`${isPaid ? "text-emerald-600" : color.text} font-black`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.08 + 0.7 }}
                    >
                      {child.progress}%
                    </motion.span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${child.progress}%` }}
                      transition={{ duration: 1.2, delay: i * 0.08 + 0.6, ease: [0.22, 1, 0.36, 1] }}
                      className={`h-full ${isPaid ? "bg-emerald-500" : color.bar} rounded-full`}
                    />
                  </div>
                </div>

                {/* Button */}
                <motion.div whileHover={{ x: 3 }} className="shrink-0 sm:ml-2">
                  {isPaid ? (
                    <Button
                      className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-4 h-10 font-semibold text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-100 transition-all"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReceiptOpen(child);
                      }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                      </svg>
                      Download Receipt
                    </Button>
                  ) : (
                    <Button className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 h-10 font-semibold text-sm flex items-center justify-center gap-2 shadow-md shadow-indigo-100 transition-all group-hover:shadow-indigo-200 group-hover:shadow-lg">
                      Open Application
                      <motion.span
                        animate={{ x: [0, 3, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.2 }}
                      >
                        <ArrowRight size={14} />
                      </motion.span>
                    </Button>
                  )}
                </motion.div>
              </div>

              {/* Mobile + tablet progress bar */}
              <div className="mt-3 lg:hidden">
                <div className="flex justify-between text-[11px] font-bold text-slate-400 mb-1.5">
                  <span>Application Progress</span>
                  <span className={`${isPaid ? "text-emerald-600" : color.text} font-black`}>
                    {child.progress}%
                  </span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${child.progress}%` }}
                    transition={{ duration: 1.2, delay: i * 0.08 + 0.6, ease: [0.22, 1, 0.36, 1] }}
                    className={`h-full ${isPaid ? "bg-emerald-500" : color.bar} rounded-full`}
                  />
                </div>
              </div>
            </motion.div>
          );
        })}
        <div className="h-4" />
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// MultiStepForm
// ─────────────────────────────────────────────
function MultiStepForm({
  child,
  formData,
  onBack,
  onPaymentSuccess,
}: {
  child: any;
  formData: any;
  onBack: () => void;
  onPaymentSuccess: (admissionNumber: string) => void;
}) {
  const [feeAmount, setFeeAmount] = useState<number | null>(null);

  const hasExistingData = child?.sections?.some(
    (s: any) => s?.field_values?.length > 0,
  );
  const [step, setStep] = useState(hasExistingData ? 2 : 1);

  const getInitialFormValues = () => {
    const values: any = {};
    child?.sections?.forEach((section: any) => {
      section?.field_values?.forEach((item: any) => {
        if (item.field && item.value !== undefined) {
          values[item.field] = item.value;
        }
      });
    });
    if (child?.savedFormValues) {
      Object.assign(values, child.savedFormValues);
    }
    return values;
  };
  const [formValues, setFormValues] = useState<any>(getInitialFormValues());
  const [docValues, setDocValues] = useState<Record<number, string | File>>({});
  const [docErrors, setDocErrors] = useState<any>({});
  const [errors, setErrors] = useState<any>({});
  const [submitting, setSubmitting] = useState(false);
  const [docSubmitting, setDocSubmitting] = useState(false);

  const [applicationId, setApplicationId] = useState(
    child.admission_number || child.id,
  );

  const [paymentMode, setPaymentMode] = useState<"online" | "offline">("online");

  const validateDocuments = () => {
    const newErrors: any = {};
    const docs = formData?.documents ?? formData?.document_fields ?? [];
    docs.forEach((doc: any) => {
      if (!docValues[doc.id]) {
        newErrors[doc.id] = true;
      }
    });
    setDocErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleStepTwoSubmit = async () => {
    const isValid = validateDocuments();
    if (!isValid) return;

    try {
      setDocSubmitting(true);
      const documents = Object.entries(docValues)
        .filter(([_, file]) => file instanceof File)
        .map(([fieldId, file]) => ({
          document_field: Number(fieldId),
          file: file as File,
        }));

      if (documents.length > 0) {
        const response = await submitDocuments({
          admission_number: applicationId,
          documents,
        });
        const fee = response?.["fee amount"] ?? response?.fee_amount ?? null;
        if (fee !== null && fee !== undefined && Number(fee) > 0) {
          setFeeAmount(Number(fee));
        }
      }
      setStep(3);
    } catch (error) {
      console.error("Document submission failed:", error);
      toast.error(error instanceof Error ? error.message : "Document submission failed");
    } finally {
      setDocSubmitting(false);
    }
  };

  useEffect(() => {
    const values: any = {};
    child?.sections?.forEach((section: any) => {
      section?.field_values?.forEach((item: any) => {
        if (item.field && item.value !== undefined) {
          values[item.field] = item.value;
        }
      });
    });
    if (child?.savedFormValues) {
      Object.assign(values, child.savedFormValues);
    }
    if (Object.keys(values).length > 0) {
      setFormValues(values);
    }
  }, [child.sections, child.savedFormValues]);

  const validateStepOne = () => {
    const newErrors: any = {};
    formData?.sections?.forEach((section: any) => {
      const fields = section.fields || [];
      fields.forEach((field: any) => {
        const value = formValues[field.id];
        if (value === undefined || value === null || String(value).trim() === "") {
          newErrors[field.id] = `${field.label} is required`;
        }
      });
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const clearDocError = (id: number) => {
    setDocErrors((prev: any) => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });
  };

  const buildSubmissionPayload = () => {
    const fieldValues: any[] = [];
    Object.entries(docValues).forEach(([fieldId, value]) => {
      fieldValues.push({ field: Number(fieldId), value });
    });
    formData?.sections?.forEach((section: any) => {
      const fields = section.fields || [];
      fields.forEach((field: any) => {
        const value = formValues[field.id];
        if (value !== undefined && value !== null && value.toString().trim() !== "") {
          fieldValues.push({ field: field.id, value });
        }
      });
    });

    return {
      admission_number: child?.admission_number || null,
      form: formData.id,
      school: formData.school,
      school_slug: formData.school_slug,
      school_class: Number(
        Object.keys(formValues).find((key) => {
          const field = formData?.sections?.flatMap((s: any) => s.fields || [])?.find((f: any) => f.id === Number(key));
          return field?.map_to_student_field === "school_class";
        })
          ? formValues[Object.keys(formValues).find((key) => {
            const field = formData?.sections?.flatMap((s: any) => s.fields || [])?.find((f: any) => f.id === Number(key));
            return field?.map_to_student_field === "school_class";
          }) as any]
          : null,
      ),
      field_values: fieldValues,
    };
  };

  const payNow = async () => {
    try {
      const amount = feeAmount ?? (formData?.fees ? Number(formData.fees) : 0);
      const admission_number = applicationId;
      const orderData = await createRazorOrder({ amount, admission_number });

      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        order_id: orderData.id,
        name: "School Admission",
        description: "Admission Fee Payment",
        handler: async function (response: any) {
          try {
            const verifyData = await verifyRazorPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              admission_number,
            });
            if (verifyData.status === "success") {
              toast.success("Online Payment Successful! 🎉");
              setTimeout(() => onPaymentSuccess(admission_number), 500);
            } else {
              toast.error("Payment Verification Failed");
            }
          } catch (error) {
            console.log(error);
            toast.error("Payment Verification Failed");
          }
        },
        prefill: { name: child.name, email: "", contact: "" },
        theme: { color: "#6366f1" },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on("payment.failed", function () {
        toast.error("Payment Cancelled");
        onBack();
      });
      rzp.on("modal.closed", function () {
        toast.error("Payment Not Completed");
        onBack();
      });
      rzp.open();
    } catch (error) {
      console.log(error);
      toast.error(error instanceof Error ? error.message : "Payment Failed");
    }
  };

  const payOffline = async () => {
    try {
      const amount = feeAmount ?? (formData?.fees ? Number(formData.fees) : 0);
      const response = await createOfflinePayment({ amount, admission_number: applicationId });
      if (response?.status === "success") {
        toast.success("Offline Payment Successfully! 🎉");
        setTimeout(() => { onPaymentSuccess(applicationId); }, 500);
      }
    } catch (error) {
      console.log(error);
      toast.error(error instanceof Error ? error.message : "Offline payment failed");
    }
  };

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, []);

  const handleStepOneSubmit = async () => {
    const isValid = validateStepOne();
    if (!isValid) return;

    try {
      setSubmitting(true);
      const payload = buildSubmissionPayload();
      let response;
      const isExisting = child?.admission_number && !String(child.admission_number).startsWith("NEW-");

      if (isExisting) {
        response = await updateSubmission(child.admission_number, payload);
      } else {
        response = await createSubmission(payload);
      }

      if (response?.admission_number) {
        setApplicationId(response.admission_number);
        child.savedFormValues = formValues;
        child.currentStep = 2;
      }
      setStep(2);
    } catch (error) {
      console.log(error);
      toast.error(error instanceof Error ? error.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  const hasSections = formData?.sections && formData.sections.length > 0;

  if (!hasSections) {
    return (
      <div className="flex-1 min-h-screen bg-white flex flex-col">
        <div className="h-[60px] sm:h-[72px] border-b border-slate-100 flex items-center px-4 sm:px-8 bg-white shadow-sm">
          <motion.button
            onClick={onBack}
            whileHover={{ x: -3 }}
            className="flex items-center gap-3 text-slate-500 hover:text-indigo-600 font-bold transition-colors group"
          >
            <div className="w-9 h-9 rounded-xl bg-slate-100 group-hover:bg-indigo-50 flex items-center justify-center transition-colors">
              <ArrowLeft size={17} className="transition-transform group-hover:-translate-x-0.5" />
            </div>
            <span className="text-sm">Back to Dashboard</span>
          </motion.button>
        </div>
        <div className="flex-1 flex items-center justify-center px-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-lg"
          >
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-slate-100 flex items-center justify-center mx-auto mb-6 sm:mb-8">
              <Shield size={38} className="text-slate-400" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-800 mb-4">
              Currently No Active Form
            </h1>
            <p className="text-slate-400 text-sm sm:text-base font-medium leading-relaxed">
              There is no admission form available right now. Please contact the school administration or try again later.
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="flex-1 flex flex-col bg-white overflow-hidden"
    >
      {/* ── TOP NAV ── */}
      <header className="h-[60px] sm:h-[72px] border-b border-slate-100 flex items-center justify-between px-4 sm:px-8 md:px-12 shrink-0 bg-white z-30 shadow-sm">
        <motion.button
          onClick={onBack}
          whileHover={{ x: -3 }}
          className="flex items-center gap-2 sm:gap-3 text-slate-500 hover:text-indigo-600 font-bold transition-colors group"
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-100 group-hover:bg-indigo-50 flex items-center justify-center transition-colors">
            <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-0.5" />
          </div>
          <span className="hidden sm:block text-sm">Back to Dashboard</span>
        </motion.button>

        {/* Mobile step indicator */}
        <div className="flex lg:hidden items-center gap-2">
          {STEPS.map((s) => (
            <div
              key={s.id}
              className={`h-2 rounded-full transition-all duration-300 ${step === s.id ? "w-8 bg-indigo-600" : step > s.id ? "w-2 bg-emerald-500" : "w-2 bg-slate-200"}`}
            />
          ))}
        </div>

        {step > 1 && (
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">
                Application ID
              </p>
              <p className="text-sm font-bold text-indigo-600 font-mono">
                {applicationId}
              </p>
            </div>
            <div className="size-8 sm:size-10 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-full flex items-center justify-center text-white font-black text-xs sm:text-sm shadow-md shadow-indigo-200">
              {child.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
            </div>
          </div>
        )}
      </header>

      {/* ── BODY ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* ── LEFT SIDEBAR — desktop only ── */}
        <aside className="w-80 border-r border-slate-100 bg-slate-50/50 p-8 hidden lg:flex flex-col shrink-0">
          <div className="mb-8">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5">
              Currently on
            </p>
            <motion.h3
              key={step}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-2xl font-black text-slate-900"
            >
              {STEPS[step - 1].label}
            </motion.h3>
          </div>

          <nav className="flex-1 space-y-2">
            {STEPS.map((s) => {
              const isCompleted = step > s.id;
              const isCurrent = step === s.id;
              return (
                <motion.div
                  key={s.id}
                  animate={{ opacity: isCurrent ? 1 : isCompleted ? 0.9 : 0.45 }}
                  transition={{ duration: 0.3 }}
                  className={`flex items-center gap-4 p-4 rounded-2xl transition-all ${isCurrent ? "bg-white shadow-md shadow-slate-100 border border-indigo-100" : isCompleted ? "bg-emerald-50/60" : ""}`}
                >
                  <div
                    className={`size-11 rounded-xl flex items-center justify-center transition-all duration-300 shadow-sm ${isCompleted ? "bg-emerald-500 text-white" : isCurrent ? "bg-indigo-600 text-white shadow-md shadow-indigo-200" : "bg-slate-200 text-slate-400"}`}
                  >
                    {isCompleted ? <CheckCircle2 size={20} /> : <s.icon size={20} />}
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Step 0{s.id}
                    </p>
                    <p className={`text-sm font-bold ${isCurrent ? "text-indigo-700" : "text-slate-700"}`}>
                      {s.label}
                    </p>
                  </div>
                  {isCurrent && (
                    <motion.div layoutId="active-dot" className="size-2 rounded-full bg-indigo-600" />
                  )}
                </motion.div>
              );
            })}
          </nav>

          <div className="p-5 bg-white rounded-3xl border border-slate-100 mt-6 shadow-sm">
            <p className="text-xs font-bold text-slate-800 flex items-center gap-2 mb-1.5">
              <Shield size={13} className="text-indigo-500" />
              Auto-saved & Secure
            </p>
            <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
              All changes are saved in real-time. You can return anytime without losing progress.
            </p>
          </div>
        </aside>

        {/* ── RIGHT PANEL ── */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
          {/* Step title */}
          <div className="shrink-0 px-4 sm:px-8 md:px-12 lg:px-16 pt-4 sm:pt-6 pb-4 sm:pb-5 bg-white border-b border-slate-100">
            <AnimatePresence mode="wait">
              <motion.div
                key={`title-${step}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22 }}
              >
                <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full mb-1.5">
                  Step 0{step} of 03
                </span>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-tight">
                  {STEPS[step - 1].title}
                </h2>
                <p className="text-slate-400 text-xs sm:text-sm font-medium mt-0.5">
                  {STEPS[step - 1].desc}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* ── SCROLLABLE CONTENT ── */}
          <main className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-10 lg:px-12 py-4 sm:py-6 bg-slate-50/40">
            <div className="max-w-5xl mx-auto">
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <StudentDetailsStep
                    key="s1"
                    child={child}
                    formData={formData}
                    formValues={formValues}
                    setFormValues={setFormValues}
                    errors={errors}
                    setErrors={setErrors}
                  />
                )}
                {step === 2 && (
                  <DocumentsStep
                    key="s2"
                    formData={formData}
                    docValues={docValues}
                    setDocValues={setDocValues}
                    docErrors={docErrors}
                    clearDocError={clearDocError}
                  />
                )}
                {step === 3 && (
                  <ReviewStep
                    formData={formData}
                    paymentMode={paymentMode}
                    setPaymentMode={setPaymentMode}
                    feeAmount={feeAmount}
                  />
                )}
              </AnimatePresence>
            </div>
          </main>

          {/* ── FOOTER ── */}
          <footer className="shrink-0 border-t border-slate-100 px-4 sm:px-8 md:px-12 py-3 sm:py-5 flex items-center justify-between bg-white z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.04)]">
            <div>
              <Button
                variant="ghost"
                onClick={() => (step === 1 ? onBack() : setStep(step - 1))}
                className={`font-bold rounded-2xl h-10 sm:h-13 px-4 sm:px-7 text-sm transition-all ${step === 1
                  ? "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                  : "text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                  }`}
              >
                {step === 1 ? "Cancel" : <><span className="hidden sm:inline">← Previous Step</span><span className="sm:hidden">← Back</span></>}
              </Button>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              <span className="text-xs font-bold text-slate-400 lg:hidden">
                {step} / {STEPS.length}
              </span>

              {step < 3 ? (
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                  <Button
                    disabled={(step === 1 && submitting) || (step === 2 && docSubmitting)}
                    onClick={() => {
                      if (step === 1) handleStepOneSubmit();
                      else if (step === 2) handleStepTwoSubmit();
                      else setStep(step + 1);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl h-10 sm:h-13 px-5 sm:px-10 font-bold shadow-lg shadow-indigo-200 transition-all flex items-center gap-2 sm:gap-2.5 text-sm"
                  >
                    {step === 1 && submitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span className="hidden sm:inline">Saving...</span>
                      </>
                    ) : step === 2 && docSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span className="hidden sm:inline">Uploading...</span>
                      </>
                    ) : (
                      <>
                        <span className="hidden sm:inline">Continue to Step 0{step + 1}</span>
                        <span className="sm:hidden">Continue</span>
                        <ArrowRight size={16} />
                      </>
                    )}
                  </Button>
                </motion.div>
              ) : (
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                  <Button
                    onClick={() => {
                      if (paymentMode === "online") payNow();
                      else payOffline();
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl h-10 sm:h-13 px-4 sm:px-10 font-bold shadow-lg shadow-emerald-200 transition-all flex items-center gap-2 sm:gap-2.5 text-sm"
                  >
                    <Shield size={15} />
                    <span className="hidden sm:inline">Confirm & Pay </span>
                    ₹{(feeAmount ?? (formData?.fees ? Number(formData.fees) : 0)).toLocaleString("en-IN")}
                  </Button>
                </motion.div>
              )}
            </div>
          </footer>
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// Step 1 — Student Details
// ─────────────────────────────────────────────
function StudentDetailsStep({
  child,
  formData,
  formValues,
  setFormValues,
  errors,
  setErrors,
}: {
  child: any;
  formData: any;
  formValues: any;
  setFormValues: any;
  errors: any;
  setErrors: any;
}) {
  const [classOptions, setClassOptions] = useState<any[]>([]);

  if (!formData) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-slate-500 font-medium">Loading form fields…</p>
      </div>
    );
  }

  const handleChange = (fieldId: number, value: string) => {
    setFormValues((prev: any) => ({ ...prev, [fieldId]: value }));
    if (errors[fieldId]) {
      setErrors((prev: any) => {
        const updated = { ...prev };
        delete updated[fieldId];
        return updated;
      });
    }
  };

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const data = await getClasses();
        const formatted = data.map((item: any) => ({
          label: item.school_class,
          value: item.id,
        }));
        setClassOptions(formatted);
      } catch (error) {
        console.log("CLASS FETCH ERROR:", error);
      }
    };
    fetchClasses();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3 }}
      className="space-y-4 sm:space-y-5"
    >
      {formData.sections?.map((section: any, sectionIndex: number) => {
        const fields = section.fields || section.form_fields || [];

        return (
          <motion.div
            key={section.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: sectionIndex * 0.1, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden"
          >
            {/* Section header */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-indigo-600 to-indigo-500">
              <div className="flex items-center gap-2.5">
                <div className="w-1 h-4 rounded-full bg-white/60" />
                <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-white">
                  {section.title}
                </h3>
              </div>
              <span className="text-[10px] font-bold text-indigo-100 bg-white/15 px-2.5 py-1 rounded-full">
                {fields.length} fields
              </span>
            </div>

            {/* Field grid — 1 col on mobile, 2 col on sm+ */}
            <div className="p-4 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 sm:gap-x-6 gap-y-4 sm:gap-y-5">
                {fields.map((field: any, fi: number) => {
                  const updatedField =
                    field.map_to_student_field === "school_class"
                      ? { ...field, options: classOptions }
                      : field;

                  return (
                    <motion.div
                      key={field.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: sectionIndex * 0.06 + fi * 0.04 + 0.12, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      className={field.field_type === "textarea" || field.full_width ? "sm:col-span-2" : ""}
                    >
                      <DynamicField
                        field={updatedField}
                        value={formValues?.[field.id] ?? ""}
                        error={errors[field.id]}
                        onChange={(value: string) => handleChange(field.id, value)}
                      />
                    </motion.div>
                  );
                })}
              </div>
            </div>

            <SectionCompletionBar fields={fields} formValues={formValues} sectionIndex={sectionIndex} />
          </motion.div>
        );
      })}
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// Section completion bar
// ─────────────────────────────────────────────
function SectionCompletionBar({
  fields,
  formValues,
  sectionIndex,
}: {
  fields: any[];
  formValues: any;
  sectionIndex: number;
}) {
  const filled = fields.filter((f: any) => !!formValues[f.id]).length;
  const pct = fields.length > 0 ? Math.round((filled / fields.length) * 100) : 0;
  const allDone = pct === 100;

  return (
    <div
      className={`px-4 sm:px-6 py-3 border-t flex items-center gap-3 transition-colors duration-500 ${allDone ? "border-emerald-100 bg-emerald-50/60" : "border-slate-100 bg-slate-50/50"}`}
    >
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className={`h-full rounded-full transition-colors duration-500 ${allDone ? "bg-emerald-400" : "bg-indigo-400"}`}
        />
      </div>
      <span
        className={`text-[10px] font-black tabular-nums whitespace-nowrap transition-colors duration-300 ${allDone ? "text-emerald-500" : "text-slate-400"}`}
      >
        {filled}/{fields.length} filled{allDone && " ✓"}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────
// DynamicField
// ─────────────────────────────────────────────
function DynamicField({
  field,
  value,
  onChange,
  error,
}: {
  field: any;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  const [focused, setFocused] = useState(false);
  const isFilled = !!value;

  const inputBase = [
    "w-full h-[48px] px-4 rounded-xl outline-none font-medium text-[14px] text-slate-800",
    "transition-all duration-200 border-2",
    error
      ? "border-rose-400 bg-rose-50 shadow-[0_0_0_3px_rgba(244,63,94,0.10)]"
      : focused
        ? "border-indigo-400 bg-white shadow-[0_0_0_3px_rgba(99,102,241,0.10)]"
        : isFilled
          ? "border-emerald-300 bg-white"
          : "border-slate-200 bg-white hover:border-indigo-200",
    "placeholder:text-slate-300",
  ].join(" ");

  const labelClass = [
    "flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest mb-1.5 transition-colors duration-200",
    error ? "text-rose-500" : focused ? "text-indigo-600" : isFilled ? "text-emerald-600" : "text-slate-400",
  ].join(" ");

  if (field.field_type === "select") {
    return (
      <div className="relative">
        <label className={labelClass}>
          {isFilled && (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
          )}
          {field.label}
          {field.is_required && <span className="text-rose-400 ml-0.5">*</span>}
        </label>
        <div className="relative">
          <button
            type="button"
            onClick={() => setFocused(!focused)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            className={`${inputBase} cursor-pointer text-left flex items-center justify-between`}
          >
            <span className={value ? "text-slate-800" : "text-slate-300"}>
              {field.options?.find((o: any) => String(o.value) === String(value))?.label || `Select ${field.label}`}
            </span>
            <motion.div animate={{ rotate: focused ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <svg width="13" height="13" viewBox="0 0 20 20" fill="none">
                <path stroke={focused ? "#6366f1" : isFilled ? "#34d399" : "#94a3b8"} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M6 8l4 4 4-4" />
              </svg>
            </motion.div>
          </button>

          <AnimatePresence>
            {focused && (
              <motion.ul
                initial={{ opacity: 0, y: -6, scaleY: 0.95 }}
                animate={{ opacity: 1, y: 0, scaleY: 1 }}
                exit={{ opacity: 0, y: -6, scaleY: 0.95 }}
                transition={{ duration: 0.15 }}
                style={{ transformOrigin: "top" }}
                className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden max-h-52 overflow-y-auto"
              >
                <li
                  onClick={() => { onChange(""); setFocused(false); }}
                  className="px-4 py-2.5 text-sm text-slate-300 font-medium cursor-pointer hover:bg-slate-50"
                >
                  Select {field.label}
                </li>
                {field.options?.map((option: any) => (
                  <li
                    key={option.value}
                    onClick={() => { onChange(String(option.value)); setFocused(false); }}
                    className={`px-4 py-2.5 text-sm font-medium cursor-pointer transition-colors ${String(value) === String(option.value) ? "bg-indigo-50 text-indigo-600 font-bold" : "text-slate-700 hover:bg-slate-50"}`}
                  >
                    {option.label}
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
        {error && <p className="mt-1 text-xs font-semibold text-rose-500">{error}</p>}
      </div>
    );
  }

  if (field.field_type === "textarea") {
    return (
      <div>
        <label className={labelClass}>
          {isFilled && (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
          )}
          {field.label}
          {field.is_required && <span className="text-rose-400 ml-0.5">*</span>}
        </label>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={field.placeholder || `Enter ${(field.label || "").toLowerCase()}`}
          rows={3}
          className={[
            "w-full px-4 py-3 rounded-xl outline-none font-medium text-[14px] text-slate-800 resize-none",
            "transition-all duration-200 border-2",
            error
              ? "border-rose-400 bg-rose-50 shadow-[0_0_0_3px_rgba(244,63,94,0.10)]"
              : focused
                ? "border-indigo-400 bg-white shadow-[0_0_0_3px_rgba(99,102,241,0.10)]"
                : isFilled
                  ? "border-emerald-300 bg-white"
                  : "border-slate-200 bg-white hover:border-indigo-200",
          ].join(" ")}
        />
        {error && <p className="mt-1 text-xs font-semibold text-rose-500">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      <label className={labelClass}>
        {isFilled && (
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
        )}
        {field.label}
        {field.is_required && <span className="text-rose-400 ml-0.5">*</span>}
      </label>
      <div className="relative">
        <input
          type={field.field_type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={field.placeholder || `Enter ${(field.label || "").toLowerCase()}`}
          className={inputBase}
        />
        <AnimatePresence>
          {isFilled && !focused && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-emerald-400 flex items-center justify-center"
            >
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                <path stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
              </svg>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {error && <p className="mt-1 text-xs font-semibold text-rose-500">{error}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────
// Step 2 — Documents
// ─────────────────────────────────────────────
function DocumentsStep({
  formData,
  docValues,
  setDocValues,
  docErrors,
  clearDocError,
}: {
  formData: any;
  docValues: any;
  setDocValues: any;
  docErrors: any;
  clearDocError: (id: number) => void;
}) {
  const docs: any[] = React.useMemo(() => {
    const raw = formData?.documents ?? formData?.document_fields ?? [];
    return [...raw].sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
  }, [formData]);

  const handleFile = (id: number, file: File) =>
    setDocValues((p: Record<number, string | File>) => ({ ...p, [id]: file }));
  const handleText = (id: number, val: string) =>
    setDocValues((p: Record<number, string | File>) => ({ ...p, [id]: val }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3 }}
      className="space-y-3 sm:space-y-4"
    >
      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 sm:p-5 flex items-start gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0 mt-0.5">
          <Upload size={16} className="text-indigo-600" />
        </div>
        <div>
          <p className="text-sm font-bold text-indigo-800 mb-1">Upload Guidelines</p>
          <p className="text-xs text-indigo-600/80 font-medium leading-relaxed">
            Accepted formats: PDF, JPG, PNG. Maximum file size: 5 MB per document. Ensure documents are clear and legible.
          </p>
        </div>
      </div>

      {docs.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
          <Upload size={28} className="opacity-40" />
          <p className="font-semibold text-sm">No documents required.</p>
        </div>
      )}

      {docs.map((doc, i) => (
        <motion.div
          key={doc.id}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.07 }}
        >
          <DocRow
            doc={doc}
            value={docValues[doc.id]}
            error={docErrors?.[doc.id]}
            onFile={(f) => handleFile(doc.id, f)}
            onText={(v) => handleText(doc.id, v)}
            onClearError={() => clearDocError(doc.id)}
          />
        </motion.div>
      ))}
    </motion.div>
  );
}

function isFileField(label: string) {
  const l = label.toLowerCase();
  return l.includes("file") || l.includes("photo") || l.includes("image");
}

function DocRow({
  doc,
  value,
  error,
  onFile,
  onText,
  onClearError,
}: {
  doc: any;
  value: string | File | undefined;
  error?: boolean;
  onFile: (f: File) => void;
  onText: (v: string) => void;
  onClearError?: () => void;
}) {
  const [focused, setFocused] = useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const isFilled = !!value;
  const fileName = value instanceof File ? value.name : null;

  return (
    <div
      className={`flex items-center justify-between p-4 sm:p-6 border-2 rounded-3xl group transition-all duration-200 gap-3 ${error
        ? "bg-rose-50 border-rose-400"
        : isFilled
          ? "bg-emerald-50 border-emerald-200"
          : focused
            ? "border-indigo-300 bg-white"
            : "bg-white border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30"
        }`}
    >
      <div className="flex items-center gap-3 sm:gap-5 flex-1 min-w-0">
        <div
          className={`size-12 sm:size-14 rounded-2xl flex items-center justify-center transition-colors shadow-sm shrink-0 ${isFilled
            ? "bg-emerald-500 text-white"
            : "bg-slate-100 text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600"
            }`}
        >
          {isFilled ? <CheckCircle2 size={22} /> : <Upload size={20} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-0.5">
            <span className="block font-bold text-slate-800 text-sm sm:text-base truncate">
              {doc.label}
            </span>
            {doc.is_required && (
              <span className="text-[10px] font-black uppercase tracking-widest text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100 shrink-0">
                Required
              </span>
            )}
            {isFilled && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200 shrink-0"
              >
                ✓ Done
              </motion.span>
            )}
          </div>
          <span className="text-xs font-medium text-slate-400 truncate block">
            {fileName
              ? `📎 ${fileName}`
              : doc.is_required
                ? "Required document"
                : "Optional document"}
          </span>
        </div>
      </div>

      <>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) {
              onFile(f);
              onClearError?.();
            }
          }}
        />
        <Button
          variant={isFilled ? "ghost" : "outline"}
          className={`rounded-xl font-bold h-10 sm:h-11 px-3 sm:px-6 text-xs sm:text-sm transition-all min-w-[90px] sm:min-w-[110px] shrink-0 ${isFilled
            ? "text-emerald-600 hover:bg-emerald-100"
            : "border-slate-200 hover:bg-indigo-600 hover:text-white hover:border-indigo-600"
            }`}
          onClick={() => fileRef.current?.click()}
        >
          {isFilled ? "✓ Uploaded" : "Choose File"}
        </Button>
      </>
    </div>
  );
}

// ─────────────────────────────────────────────
// Step 3 — Review & Pay
// ─────────────────────────────────────────────
function ReviewStep({
  formData,
  paymentMode,
  setPaymentMode,
  feeAmount,
}: {
  formData: any;
  paymentMode: "online" | "offline";
  setPaymentMode: React.Dispatch<React.SetStateAction<"online" | "offline">>;
  feeAmount: number | null;
}) {
  const resolvedAmount = feeAmount ?? (formData?.fees ? Number(formData.fees) : 0);
  const fees = [{ label: "Admission Fee", amount: resolvedAmount }];
  const total = resolvedAmount.toFixed(2);
  const feesEnabled = formData?.fees_enable !== false;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-4 sm:space-y-5 max-w-4xl mx-auto"
    >
      {/* ── SUCCESS BANNER ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-500 to-teal-500 p-5 sm:p-6 text-white shadow-xl shadow-emerald-100"
      >
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10" />
        <div className="absolute -right-4 -bottom-10 w-28 h-28 rounded-full bg-white/10" />
        <div className="absolute right-24 -bottom-6 w-16 h-16 rounded-full bg-white/10" />

        <div className="relative flex items-center gap-4 sm:gap-5">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
            className="w-12 h-12 sm:w-14 sm:h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shrink-0 border border-white/30"
          >
            <CheckCircle2 size={24} className="text-white" />
          </motion.div>
          <div>
            <motion.p
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 }}
              className="font-black text-lg sm:text-xl mb-0.5 tracking-tight"
            >
              Application Complete! 🎉
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="text-emerald-100 text-xs sm:text-sm font-medium"
            >
              All steps done. One last step — complete your payment to confirm your seat.
            </motion.p>
          </div>
        </div>
      </motion.div>

      {/* ── MAIN GRID — stacked on mobile, side-by-side on lg ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-5">
        {/* ── LEFT: ORDER SUMMARY ── */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="lg:col-span-3 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden"
        >
          {/* Payment mode toggle */}
          <div className="flex gap-3 p-4 sm:p-5 sm:pb-0">
            <button
              type="button"
              onClick={() => setPaymentMode("online")}
              className={`flex-1 sm:flex-none px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl border-2 font-bold transition-all text-sm ${paymentMode === "online"
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-slate-600 border-slate-200"
                }`}
            >
              Online Payment
            </button>
            <button
              type="button"
              onClick={() => setPaymentMode("offline")}
              className={`flex-1 sm:flex-none px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl border-2 font-bold transition-all text-sm ${paymentMode === "offline"
                ? "bg-emerald-600 text-white border-emerald-600"
                : "bg-white text-slate-600 border-slate-200"
                }`}
            >
              Offline Payment
            </button>
          </div>

          {/* Card header */}
          <div className="px-5 sm:px-7 py-4 sm:py-5 border-b border-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
                <CreditCard size={17} className="text-indigo-600" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Breakdown</p>
                <p className="text-sm font-black text-slate-800 leading-tight">Order Summary</p>
              </div>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
              ✓ Verified
            </span>
          </div>

          {/* Fee rows */}
          <div className="px-5 sm:px-7 py-4 sm:py-5 space-y-1">
            {fees.map((fee: any, i: number) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + i * 0.08 }}
                className="flex items-center justify-between py-3 sm:py-3.5 border-b border-slate-50 last:border-0 group"
              >
                <div className="flex items-center gap-3 sm:gap-3.5">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-slate-50 group-hover:bg-indigo-50 flex items-center justify-center transition-colors">
                    <div className="w-2 h-2 rounded-full bg-indigo-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-700">
                      {fee.label || fee.fee_type || `Fee ${i + 1}`}
                    </p>
                    <p className="text-xs text-slate-400 font-medium">
                      {fee.description || "One-time payment"}
                    </p>
                  </div>
                </div>
                <span className="text-base font-black text-slate-800">
                  ₹{Number(fee.amount).toLocaleString("en-IN")}
                </span>
              </motion.div>
            ))}
          </div>

          {/* Total */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
            className="mx-4 sm:mx-5 mb-4 sm:mb-5 rounded-2xl bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100 px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between"
          >
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-0.5">Amount Payable</p>
              <p className="text-base sm:text-lg font-black text-slate-900">Total Due</p>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Inclusive of all taxes & fees</p>
            </div>
            <div className="text-right">
              <motion.p
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
                className="text-2xl sm:text-3xl font-black text-indigo-600 tracking-tight"
              >
                ₹{Number(total).toLocaleString("en-IN")}
              </motion.p>
              <p className="text-[10px] font-bold text-indigo-400 mt-0.5">INR</p>
            </div>
          </motion.div>
        </motion.div>

        {/* ── RIGHT: PAYMENT INFO ── */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5, ease: "easeOut" }}
            className="group relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#4F46E5] via-[#6366F1] to-[#8B5CF6] p-6 sm:p-7 text-white shadow-2xl shadow-indigo-200/50"
          >
            <div className="absolute -right-4 -top-4 h-40 w-40 rounded-full bg-white/10 blur-2xl transition-transform duration-700 group-hover:scale-110" />
            <div className="absolute -bottom-10 left-1/2 h-32 w-32 -translate-x-1/2 rounded-full bg-indigo-400/20 blur-3xl" />

            <div className="relative z-10">
              <div className="mb-5 sm:mb-6 flex items-center gap-4">
                <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-white/20 shadow-inner backdrop-blur-md border border-white/30">
                  <Shield size={20} className="text-white drop-shadow-md" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold tracking-tight leading-none">
                    Secure Checkout
                  </h3>
                </div>
              </div>

              <p className="mb-5 sm:mb-6 text-sm font-medium leading-relaxed text-indigo-50/90">
                Your payment is protected by industry-standard encryption. We do not store your sensitive card information.
              </p>

              <div className="flex flex-wrap gap-2">
                {["UPI", "Debit Card", "Credit Card", "Net Banking"].map((method, i) => (
                  <motion.span
                    key={method}
                    whileHover={{ scale: 1.05, backgroundColor: "rgba(255, 255, 255, 0.25)" }}
                    whileTap={{ scale: 0.95 }}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.1 }}
                    className="cursor-default rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-sm transition-colors"
                  >
                    {method}
                  </motion.span>
                ))}
              </div>

              {!feesEnabled && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-5 sm:mt-6 flex items-center gap-3 rounded-2xl border border-amber-200/20 bg-amber-500/20 p-3 backdrop-blur-md"
                >
                  <div className="flex-shrink-0 text-amber-300">
                    <AlertCircle size={18} />
                  </div>
                  <p className="text-[11px] font-bold leading-tight text-amber-100">
                    Online payment is currently disabled. Please contact the school office to proceed.
                  </p>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// UploadRow (unused but kept for compatibility)
// ─────────────────────────────────────────────
function UploadRow({
  label,
  description,
  required,
}: {
  label: string;
  description: string;
  required?: boolean;
}) {
  const [uploaded, setUploaded] = useState(false);

  return (
    <div
      className={`flex items-center justify-between p-4 sm:p-6 border-2 rounded-3xl group transition-all duration-200 gap-3 ${uploaded
        ? "bg-emerald-50 border-emerald-200"
        : "bg-white border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30"
        }`}
    >
      <div className="flex items-center gap-3 sm:gap-5 flex-1 min-w-0">
        <div
          className={`size-12 sm:size-14 rounded-2xl flex items-center justify-center transition-colors shadow-sm shrink-0 ${uploaded
            ? "bg-emerald-500 text-white"
            : "bg-slate-100 text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600"
            }`}
        >
          {uploaded ? <CheckCircle2 size={22} /> : <Upload size={20} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="block font-bold text-slate-800 text-sm sm:text-base">
              {label}
            </span>
            {required && (
              <span className="text-[10px] font-black uppercase tracking-widest text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                Required
              </span>
            )}
          </div>
          <span className="text-xs font-medium text-slate-400 truncate block">{description}</span>
        </div>
      </div>
      <Button
        variant={uploaded ? "ghost" : "outline"}
        className={`rounded-xl font-bold h-10 sm:h-11 px-3 sm:px-6 text-xs sm:text-sm transition-all min-w-[90px] sm:min-w-[110px] shrink-0 ${uploaded
          ? "text-emerald-600 hover:bg-emerald-100"
          : "border-slate-200 hover:bg-indigo-600 hover:text-white hover:border-indigo-600"
          }`}
        onClick={() => setUploaded(!uploaded)}
      >
        {uploaded ? "✓ Uploaded" : "Choose File"}
      </Button>
    </div>
  );
}