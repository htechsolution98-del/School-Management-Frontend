"use client";

import React, { useMemo, useState } from "react";
import {
  Printer,
  Download,
  X,
  ShieldCheck,
  CheckCircle2,
  Award,
  Loader2,
  FileDown,
  Check,
} from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { toast } from "sonner";
import type { CertificateRequestItem } from "@/lib/certificate";

interface DigitalCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: CertificateRequestItem | null;
}

export function DigitalCertificateModal({
  isOpen,
  onClose,
  request,
}: DigitalCertificateModalProps) {
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const parsedGeneratedData = useMemo(() => {
    if (!request?.generated_data) return null;
    if (typeof request.generated_data === "string") {
      try {
        return JSON.parse(request.generated_data);
      } catch {
        return { html: request.generated_data };
      }
    }
    return request.generated_data;
  }, [request?.generated_data]);

  const rawHtml = parsedGeneratedData?.html || null;
  const certNumber =
    request?.certificate_number ||
    parsedGeneratedData?.certNumber ||
    (request ? `CERT-${request.id}` : "");
  const certTitle =
    request?.certificate_type_name ||
    parsedGeneratedData?.certType ||
    "Official Certificate";
  const studentName =
    request?.student_name || parsedGeneratedData?.studentName || "Student";
  const grNumber = request?.student_gr_no || parsedGeneratedData?.grNo || "";

  // Check if signatures are already inside the saved HTML
  const hasSignaturesInHtml = useMemo(() => {
    if (!rawHtml) return false;
    return (
      rawHtml.includes("Prepared By") ||
      rawHtml.includes("Principal") ||
      rawHtml.includes("Verified By")
    );
  }, [rawHtml]);

  if (!isOpen || !request) return null;

  const handleDownloadPdf = async () => {
    const element = document.getElementById("digital-certificate-sheet");
    if (!element) {
      toast.error("Certificate document element not found.");
      return;
    }

    setIsDownloadingPdf(true);
    const toastId = toast.loading("Generating high-resolution PDF certificate...");

    try {
      const canvas = await html2canvas(element, {
        scale: 2.5, // Crisp 300DPI vector-like rendering
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: 1024,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight, undefined, "FAST");

      const safeTitle = (certTitle || "Certificate").replace(/[^a-zA-Z0-9_-]/g, "_");
      const safeName = (studentName || "Student").replace(/[^a-zA-Z0-9_-]/g, "_");
      const filename = `${safeTitle}_${safeName}.pdf`;

      pdf.save(filename);
      toast.success(`Downloaded ${filename} successfully!`, { id: toastId });
    } catch (err: any) {
      console.error("PDF generation failed:", err);
      toast.error("Direct PDF capture failed. Opening print dialog as fallback...", { id: toastId });
      handlePrint();
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handlePrint = () => {
    if (!rawHtml) {
      window.print();
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${certTitle} - ${studentName}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
            * {
              box-sizing: border-box;
            }
            body {
              margin: 0;
              padding: 0;
              font-family: Georgia, 'Times New Roman', serif;
              color: #0f172a;
              background: #ffffff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .certificate-sheet-print {
              position: relative;
              width: 100%;
              max-width: 800px;
              margin: 0 auto;
              padding: 36px 40px;
              background: #ffffff;
              border: 3px double #0f172a;
              box-sizing: border-box;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            th, td {
              padding: 5px 8px;
            }
            .no-print {
              display: none !important;
            }
          </style>
        </head>
        <body>
          <div class="certificate-sheet-print">
            ${rawHtml}
            ${
              !hasSignaturesInHtml
                ? `
                <div style="margin-top: 48px; display: grid; grid-template-columns: 1fr 1fr 1fr; text-align: center; font-size: 11px; font-family: sans-serif;">
                  <div>
                    <div style="border-top: 1px solid #334155; padding-top: 6px; font-weight: 600;">Prepared By (Clerk)</div>
                  </div>
                  <div>
                    <div style="border-top: 1px solid #334155; padding-top: 6px; font-weight: 600;">Verified By / Head Clerk</div>
                  </div>
                  <div>
                    <div style="border-top: 1px solid #334155; padding-top: 6px; font-weight: 600;">Principal / Headmaster</div>
                    <div style="font-size: 9px; color: #64748b; margin-top: 2px;">(With Official Seal)</div>
                  </div>
                </div>
              `
                : ""
            }
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-5xl h-[94vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto">
        {/* Top Action Toolbar */}
        <div className="px-5 sm:px-7 py-3.5 border-b border-slate-200/80 flex items-center justify-between bg-white shrink-0 z-20 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-snug">
                  {certTitle}
                </h3>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5" /> Official Digital Copy
                </span>
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="font-semibold text-slate-800">{studentName}</span>
                {grNumber && <span>• GR: {grNumber}</span>}
                <span className="font-mono text-slate-600">• #{certNumber}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Primary Download PDF Button */}
            <button
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold text-xs shadow-sm shadow-emerald-600/20 transition-all hover:shadow-md disabled:opacity-50"
              title="Download as PDF file directly"
            >
              {isDownloadingPdf ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </>
              )}
            </button>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              disabled={isDownloadingPdf}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors shadow-2xs"
              title="Print Document"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">Print</span>
            </button>

            {request.certificate_file && (
              <a
                href={request.certificate_file}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
                title="Download Attached Physical File"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Attached File</span>
              </a>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors ml-1"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Certificate Scrollable Canvas Stage */}
        <div className="p-4 sm:p-8 md:p-12 overflow-y-auto flex-1 bg-slate-100/80 flex flex-col items-center">
          {rawHtml ? (
            <div className="w-full flex flex-col items-center pb-12">
              {/* Authentic Paper Sheet Container */}
              <div
                id="digital-certificate-sheet"
                className="w-full max-w-[820px] bg-white rounded-xs shadow-2xl border-4 border-slate-800 p-8 sm:p-14 relative font-serif text-slate-900 leading-relaxed box-border"
                style={{
                  minHeight: "1050px",
                  boxShadow: "0 20px 40px -15px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)",
                }}
              >
                {/* Classic Inner Border Frame */}
                <div className="border-2 border-slate-600 p-6 sm:p-8 h-full flex flex-col justify-between relative">
                  {/* Watermark Emblem in Background */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.035] select-none z-0">
                    <Award className="w-96 h-96 text-slate-900" />
                  </div>

                  {/* Rendered Live HTML Content from Clerk */}
                  <div
                    className="relative z-10 w-full certificate-content-view text-sm sm:text-base"
                    dangerouslySetInnerHTML={{ __html: rawHtml }}
                  />

                  {/* Footer Signatures (Guaranteed visible if not present in saved draft) */}
                  {!hasSignaturesInHtml && (
                    <div className="pt-14 grid grid-cols-3 text-center text-xs font-sans relative z-10">
                      <div>
                        <div className="border-t border-slate-700 pt-1.5 mx-2 sm:mx-6 font-semibold">
                          Prepared By (Clerk)
                        </div>
                      </div>
                      <div>
                        <div className="border-t border-slate-700 pt-1.5 mx-2 sm:mx-6 font-semibold">
                          Verified By / Head Clerk
                        </div>
                      </div>
                      <div>
                        <div className="border-t border-slate-700 pt-1.5 mx-2 sm:mx-6 font-semibold">
                          Principal / Headmaster
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">(With Official Seal)</p>
                      </div>
                    </div>
                  )}

                  {/* Official Digital Seal & Verification Stamp */}
                  <div className="mt-12 pt-5 border-t border-slate-300 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-sans relative z-10">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                      <span className="font-medium text-slate-700">
                        Digitally Verified & Issued by School Clerk Office
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
                      <span>REF: {certNumber}</span>
                      <span>•</span>
                      <span>SECURE RECORD</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Helpful download hint at bottom */}
              <p className="text-center text-xs text-slate-400 mt-4 font-sans">
                This document is an authentic digital replica of the student's official certificate. You can print or download the PDF anytime.
              </p>
            </div>
          ) : (
            /* Fallback if no HTML is available */
            <div className="w-full max-w-lg bg-white rounded-3xl shadow-lg border border-slate-200 p-8 text-center my-auto">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-100">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-bold text-slate-900 mb-1">
                Certificate Approved & Issued
              </h4>
              <p className="text-xs sm:text-sm text-slate-500 mb-6">
                Your certificate for <span className="font-semibold text-slate-800">{certTitle}</span> has been verified and approved by the clerk desk.
              </p>

              <div className="bg-slate-50 rounded-2xl p-5 text-left space-y-2.5 mb-6 border border-slate-100 text-xs text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-400">Certificate No:</span>
                  <span className="font-mono font-bold text-slate-900">{certNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Student:</span>
                  <span className="font-semibold text-slate-900">{studentName}</span>
                </div>
                {grNumber && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">GR Number:</span>
                    <span className="font-medium">{grNumber}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400">Status:</span>
                  <span className="font-bold text-emerald-600">Issued</span>
                </div>
              </div>

              {request.certificate_file ? (
                <a
                  href={request.certificate_file}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors shadow-xs"
                >
                  <Download className="w-4 h-4" /> Download Official File
                </a>
              ) : (
                <p className="text-xs text-slate-400">
                  Please contact the clerk desk if you require an in-person printed certificate.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
