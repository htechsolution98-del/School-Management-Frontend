"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
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
  const paperStageRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const [paperScale, setPaperScale] = useState(() => typeof window === "undefined" ? 1 : Math.min(1, (window.innerWidth - 24) / 820));
  const [paperDisplayHeight, setPaperDisplayHeight] = useState(1050);

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

  useEffect(() => {
    if (!isOpen || !rawHtml) return;
    const stage = paperStageRef.current;
    const paper = paperRef.current;
    if (!stage || !paper) return;

    const updateFit = () => {
      const scale = Math.min(1, Math.max(0.2, stage.clientWidth / 820));
      const fullHeight = Math.max(1050, paper.scrollHeight);
      setPaperScale((current) => Math.abs(current - scale) > 0.002 ? scale : current);
      setPaperDisplayHeight((current) => Math.abs(current - fullHeight * scale) > 1 ? fullHeight * scale : current);
    };

    updateFit();
    const observer = new ResizeObserver(updateFit);
    observer.observe(stage);
    observer.observe(paper);
    window.addEventListener("resize", updateFit);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateFit);
    };
  }, [isOpen, rawHtml, request?.id]);

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
    setIsDownloadingPdf(true);
    const toastId = toast.loading("Generating high-resolution PDF certificate...");

    try {
      if (!element) {
        if (!request.certificate_file) throw new Error("Certificate document is not available.");
        const response = await fetch(request.certificate_file, { credentials: "include" });
        if (!response.ok) throw new Error("Could not download the issued certificate file.");
        const sourceFile = await response.blob();
        const fileIsPdf = sourceFile.type.toLowerCase().includes("pdf") || /\.pdf(?:$|[?#])/i.test(request.certificate_file);
        if (!fileIsPdf) throw new Error("The issued certificate file is not a PDF.");
        const fileUrl = URL.createObjectURL(sourceFile);
        const anchor = document.createElement("a");
        anchor.href = fileUrl;
        anchor.download = `${(certTitle || "Certificate").replace(/[^a-zA-Z0-9_-]/g, "_")}_${(studentName || "Student").replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        window.setTimeout(() => URL.revokeObjectURL(fileUrl), 1000);
        toast.success("Certificate PDF downloaded.", { id: toastId });
        return;
      }

      const canvas = await html2canvas(element, {
        scale: Math.min(2, window.devicePixelRatio || 1),
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: 1024,
        onclone: (clonedDocument) => {
          const clonedSheet = clonedDocument.getElementById("digital-certificate-sheet") as HTMLElement | null;
          if (!clonedSheet) return;

          // Export the same desktop-proportioned certificate when previewed on a phone.
          Object.assign(clonedSheet.style, {
            width: "820px",
            maxWidth: "none",
            minHeight: "1050px",
            padding: "56px",
            transform: "none",
          });
          const clonedFrame = clonedSheet.querySelector<HTMLElement>(".certificate-sheet-frame");
          if (clonedFrame) Object.assign(clonedFrame.style, { padding: "32px", borderWidth: "2px" });

          const colorCanvas = clonedDocument.createElement("canvas");
          colorCanvas.width = colorCanvas.height = 1;
          const colorContext = colorCanvas.getContext("2d", { willReadFrequently: true });
          const normalizeColor = (value: string) => {
            if (!colorContext || !/(oklch|oklab|color\()/i.test(value)) return value;
            colorContext.clearRect(0, 0, 1, 1);
            colorContext.fillStyle = "#000000";
            colorContext.fillStyle = value;
            colorContext.fillRect(0, 0, 1, 1);
            const [red, green, blue, alpha] = colorContext.getImageData(0, 0, 1, 1).data;
            return `rgba(${red}, ${green}, ${blue}, ${alpha / 255})`;
          };
          const inlineProperties = [
            "display", "position", "box-sizing", "width", "height", "min-width", "max-width", "min-height", "max-height",
            "margin-top", "margin-right", "margin-bottom", "margin-left", "padding-top", "padding-right",
            "padding-bottom", "padding-left", "font-family", "font-size", "font-weight", "font-style",
            "line-height", "letter-spacing", "color", "background-color", "border-top-width", "border-right-width",
            "border-bottom-width", "border-left-width", "border-top-style", "border-right-style", "border-bottom-style",
            "border-left-style", "border-top-color", "border-right-color", "border-bottom-color", "border-left-color",
            "border-radius", "border-collapse", "border-spacing", "table-layout", "text-align", "vertical-align",
            "white-space", "word-break", "overflow-wrap", "overflow-x", "overflow-y", "object-fit", "list-style-type", "opacity", "flex-direction", "flex-wrap",
            "flex-grow", "flex-shrink", "flex-basis", "align-items", "align-self", "justify-content", "gap", "row-gap", "column-gap",
            "grid-template-columns", "grid-template-rows", "grid-column-start", "grid-column-end",
            "grid-row-start", "grid-row-end", "text-decoration", "text-transform", "box-shadow",
          ];
          const nodes = [clonedSheet, ...Array.from(clonedSheet.querySelectorAll<HTMLElement>("*"))];
          for (const node of nodes) {
            const computed = clonedDocument.defaultView?.getComputedStyle(node);
            if (!computed) continue;
            const declarations = inlineProperties.map((property) => {
              let value = computed.getPropertyValue(property);
              if (/(oklch|oklab|color\()/i.test(value)) {
                if (/color$/.test(property) || property === "color" || property === "background-color") value = normalizeColor(value);
                else return null;
              }
              return value ? [property, value] as const : null;
            }).filter((item): item is readonly [string, string] => item !== null);
            node.removeAttribute("style");
            declarations.forEach(([property, value]) => node.style.setProperty(property, value));
          }

          // html2canvas cannot parse the app's oklch stylesheet, so use the
          // computed styles captured above for this isolated certificate tree.
          clonedDocument.querySelectorAll('style, link[rel="stylesheet"]').forEach((styleNode) => styleNode.remove());
        },
      });

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfPageHeight = pdf.internal.pageSize.getHeight();
      const pixelsPerMm = canvas.width / pdfWidth;
      const pagePixelHeight = Math.floor(pdfPageHeight * pixelsPerMm);
      const pageCount = Math.ceil(canvas.height / pagePixelHeight);

      for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
        const sourceY = pageIndex * pagePixelHeight;
        const sliceHeight = Math.min(pagePixelHeight, canvas.height - sourceY);
        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        pageCanvas.height = sliceHeight;
        const pageContext = pageCanvas.getContext("2d");
        if (!pageContext) throw new Error("Could not prepare a PDF page.");
        pageContext.fillStyle = "#ffffff";
        pageContext.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        pageContext.drawImage(canvas, 0, sourceY, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
        if (pageIndex > 0) pdf.addPage();
        pdf.addImage(pageCanvas.toDataURL("image/jpeg", 0.96), "JPEG", 0, 0, pdfWidth, sliceHeight / pixelsPerMm, undefined, "FAST");
      }

      const safeTitle = (certTitle || "Certificate").replace(/[^a-zA-Z0-9_-]/g, "_");
      const safeName = (studentName || "Student").replace(/[^a-zA-Z0-9_-]/g, "_");
      const filename = `${safeTitle}_${safeName}.pdf`;

      pdf.save(filename);
      toast.success(`Downloaded ${filename} successfully!`, { id: toastId });
    } catch (err: any) {
      console.error("PDF generation failed:", err);
      toast.error(err?.message || "Could not generate the certificate PDF. Please try again.", { id: toastId });
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
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/70 p-0 backdrop-blur-xs sm:p-4 md:p-6">
      <div className="my-auto flex h-[100dvh] w-full max-w-5xl flex-col overflow-hidden border border-slate-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200 sm:h-[94vh] sm:rounded-3xl">
        {/* Top Action Toolbar */}
        <div className="relative z-20 flex shrink-0 flex-col gap-3 border-b border-slate-200/80 bg-white px-3 py-3 shadow-xs sm:flex-row sm:items-center sm:justify-between sm:px-7 sm:py-3.5">
          <div className="flex min-w-0 items-start gap-2.5 pr-8 sm:items-center sm:gap-3 sm:pr-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-600 shadow-xs sm:h-10 sm:w-10 sm:rounded-2xl">
              <Award className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                <h3 className="min-w-0 flex-1 truncate font-bold text-slate-900 text-sm leading-snug sm:text-base">
                  {certTitle}
                </h3>
                <span className="hidden shrink-0 items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 sm:inline-flex">
                  <ShieldCheck className="w-3.5 h-3.5" /> Official Digital Copy
                </span>
              </div>
              <p className="mt-0.5 truncate text-[11px] text-slate-500 sm:text-xs">
                <span className="font-semibold text-slate-800">{studentName}</span>
                {grNumber && <span>• GR: {grNumber}</span>}
                <span className="font-mono text-slate-600">• #{certNumber}</span>
              </p>
            </div>
          </div>

          <button onClick={onClose} className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 sm:hidden" aria-label="Close certificate">
            <X className="h-5 w-5" />
          </button>

          <div className="flex w-full items-center gap-2 sm:w-auto">
            {/* Primary Download PDF Button */}
            <button
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-2.5 text-xs font-semibold text-white shadow-sm shadow-blue-600/20 transition-all hover:bg-blue-700 hover:shadow-md disabled:opacity-50 sm:h-auto sm:flex-none sm:px-4 sm:py-2"
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
                  <span className="sm:hidden">PDF</span><span className="hidden sm:inline">Download PDF</span>
                </>
              )}
            </button>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              disabled={isDownloadingPdf}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-2xs transition-colors hover:bg-slate-50 sm:h-auto sm:w-auto sm:gap-1.5 sm:px-3.5 sm:py-2"
              title="Print Document"
            >
              <Printer className="h-3.5 w-3.5 text-slate-600" />
              <span className="hidden sm:inline">Print</span>
            </button>

            {request.certificate_file && (
              <a
                href={request.certificate_file}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition-colors hover:bg-slate-200 sm:h-auto sm:w-auto sm:gap-1.5 sm:px-3 sm:py-2"
                title="Download Attached Physical File"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Attached File</span>
              </a>
            )}

            <button
              onClick={onClose}
              className="ml-1 hidden rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 sm:block"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Certificate Scrollable Canvas Stage */}
        <div ref={paperStageRef} className="min-h-0 flex-1 touch-pan-y overflow-y-auto bg-slate-100/80 p-2 sm:p-8 md:p-12">
          {rawHtml ? (
            <div className="mx-auto pb-6 sm:pb-12" style={{ width: `${820 * paperScale}px`, height: `${paperDisplayHeight}px` }}>
              {/* Authentic Paper Sheet Container */}
              <div
                id="digital-certificate-sheet"
                ref={paperRef}
                className="relative box-border min-h-[1050px] w-[820px] max-w-none rounded-sm border-4 border-slate-800 bg-white p-14 font-serif leading-relaxed text-slate-900 shadow-2xl"
                style={{
                  width: "820px",
                  maxWidth: "none",
                  minHeight: "1050px",
                  padding: "56px",
                  transform: `scale(${paperScale})`,
                  transformOrigin: "top left",
                  boxShadow: "0 20px 40px -15px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)",
                }}
              >
                {/* Classic Inner Border Frame */}
                <div className="certificate-sheet-frame relative flex h-full flex-col justify-between border-2 border-slate-600 p-8">
                  <style>{`
                    .certificate-content-view { width: 100%; min-width: 0; overflow-wrap: anywhere; }
                    .certificate-content-view * { box-sizing: border-box; max-width: 100%; }
                    .certificate-content-view table { width: 100% !important; max-width: 100%; table-layout: fixed; border-collapse: collapse; }
                    .certificate-content-view th, .certificate-content-view td { overflow-wrap: anywhere; word-break: normal; }
                    .certificate-content-view img { max-width: 100% !important; height: auto !important; object-fit: contain; }
                  `}</style>
                  {/* Watermark Emblem in Background */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.035] select-none z-0">
                    <Award className="w-96 h-96 text-slate-900" />
                  </div>

                  {/* Rendered Live HTML Content from Clerk */}
                  <div
                    className="relative z-10 w-full certificate-content-view"
                    style={{ fontSize: "16px" }}
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
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-blue-700"
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
