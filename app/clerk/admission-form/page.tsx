"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import QRCode from "qrcode";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileText,
  IndianRupee,
  Layers,
  Loader2,
  MessageCircle,
  Plus,
  QrCode,
  RefreshCw,
  Search,
  Share2,
  Sparkles,
  Trash2,
  X,
  Code2,
} from "lucide-react";

import {
  getAdmissionForms,
  toggleFormStatus,
  deleteAdmissionForm,
  getPublishedFormLink,
} from "@/lib/principal";
import type { AdmissionFormResponse } from "@/types/principal";
import PrincipalFormBuilder from "@/components/forms/principal-form-builder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { camelCaseText } from "@/lib/table-utils";
import "../clerk-workspace.css";

// ─── Modal Backdrop ──────────────────────────────────────────────────────────
function ModalBackdrop({ onClick }: { onClick: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClick}
      className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs"
    />
  );
}

// ─── Share & QR Code Modal ────────────────────────────────────────────────────
function ShareQrModal({
  form,
  link,
  onClose,
}: {
  form: AdmissionFormResponse | null;
  link: string;
  onClose: () => void;
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [embedCopied, setEmbedCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"qr" | "link" | "embed">("qr");

  useEffect(() => {
    if (link) {
      QRCode.toDataURL(link, {
        width: 400,
        margin: 2,
        color: {
          dark: "#0f172a",
          light: "#ffffff",
        },
      }).then(setQrDataUrl);
    }
  }, [link]);

  const handleCopy = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Admission form link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const embedCode = `<iframe src="${link}" width="100%" height="800" frameborder="0" style="border: none; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);"></iframe>`;

  const handleCopyEmbed = () => {
    navigator.clipboard.writeText(embedCode);
    setEmbedCopied(true);
    toast.success("Embed iframe code copied to clipboard!");
    setTimeout(() => setEmbedCopied(false), 2000);
  };

  const downloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `admission-qr-${form?.title?.toLowerCase().replace(/\s+/g, "-") || "form"}.png`;
    a.click();
    toast.success("QR Code downloaded as PNG!");
  };

  const shareWhatsApp = () => {
    const text = encodeURIComponent(
      `🎓 *Online Admission Open*\nPlease fill out the school admission form online using this link:\n${link}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  };

  return (
    <AnimatePresence mode="wait">
      <ModalBackdrop key="share-backdrop" onClick={onClose} />

      <motion.div
        key="share-modal"
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ type: "spring", stiffness: 400, damping: 32 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-200/80 flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-100 bg-gradient-to-r from-indigo-50/50 via-white to-sky-50/50 px-6 py-4.5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-200 shrink-0">
                <Share2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 leading-tight">
                  Share Admission Form
                </h2>
                <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[280px]">
                  {form ? camelCaseText(form.title) : "Admission Form"}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Sub Navigation */}
          <div className="flex border-b border-slate-100 bg-slate-50/50 p-1.5 gap-1">
            <button
              onClick={() => setActiveTab("qr")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-xl transition-all ${
                activeTab === "qr"
                  ? "bg-white text-indigo-600 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <QrCode className="h-3.5 w-3.5" />
              QR Code
            </button>
            <button
              onClick={() => setActiveTab("link")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-xl transition-all ${
                activeTab === "link"
                  ? "bg-white text-indigo-600 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Copy className="h-3.5 w-3.5" />
              Direct Link
            </button>
            <button
              onClick={() => setActiveTab("embed")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-xl transition-all ${
                activeTab === "embed"
                  ? "bg-white text-indigo-600 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Code2 className="h-3.5 w-3.5" />
              Website Embed
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === "qr" && (
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl shadow-inner">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt="Admission Form QR Code"
                      className="w-48 h-48 rounded-xl object-contain bg-white p-2 shadow-xs"
                    />
                  ) : (
                    <div className="w-48 h-48 flex items-center justify-center text-slate-400">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    Scan to Apply on Mobile
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Print this QR code on flyers, school notice boards, or entrance banners.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2.5 w-full pt-1">
                  <Button
                    onClick={downloadQr}
                    className="flex-1 h-9.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs"
                  >
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                    Download QR (PNG)
                  </Button>
                  <Button
                    variant="outline"
                    onClick={shareWhatsApp}
                    className="h-9.5 text-xs font-bold text-emerald-700 border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100 rounded-xl"
                  >
                    <MessageCircle className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
                    WhatsApp
                  </Button>
                </div>
              </div>
            )}

            {activeTab === "link" && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">
                    Public Admission Form URL
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      value={link}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 pr-20 text-xs font-mono text-slate-700 focus:outline-none"
                    />
                    <Button
                      size="sm"
                      onClick={handleCopy}
                      className="absolute right-1 top-1 bottom-1 px-3 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
                    >
                      {copied ? (
                        <>
                          <Check className="h-3.5 w-3.5 mr-1 text-white" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5 mr-1" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-2">
                  <p className="text-xs font-bold text-slate-800">Quick Actions</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      onClick={shareWhatsApp}
                      className="h-9 text-xs font-semibold text-emerald-700 border-emerald-200 bg-white hover:bg-emerald-50 rounded-xl justify-start"
                    >
                      <MessageCircle className="h-3.5 w-3.5 mr-2 text-emerald-600" />
                      Share to WhatsApp
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => window.open(link, "_blank")}
                      className="h-9 text-xs font-semibold text-indigo-700 border-indigo-200 bg-white hover:bg-indigo-50 rounded-xl justify-start"
                    >
                      <ExternalLink className="h-3.5 w-3.5 mr-2 text-indigo-600" />
                      Open Live Form
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "embed" && (
              <div className="space-y-3">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Copy and paste this HTML embed snippet into your school’s official website or admissions page:
                </p>
                <div className="relative">
                  <textarea
                    readOnly
                    rows={4}
                    value={embedCode}
                    className="w-full bg-slate-900 text-indigo-200 rounded-xl p-3 text-[11px] font-mono leading-relaxed focus:outline-none resize-none"
                  />
                </div>
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={handleCopyEmbed}
                    className="text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl"
                  >
                    {embedCopied ? (
                      <>
                        <Check className="h-3.5 w-3.5 mr-1 text-white" />
                        Code Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 mr-1" />
                        Copy Embed Code
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Form Details Modal ────────────────────────────────────────────────────────
function FormDetailsModal({
  form,
  onClose,
  onShare,
}: {
  form: AdmissionFormResponse;
  onClose: () => void;
  onShare: () => void;
}) {
  return (
    <AnimatePresence mode="wait">
      <ModalBackdrop key="details-backdrop" onClick={onClose} />

      <motion.div
        key="details-modal"
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={{ type: "spring", stiffness: 400, damping: 32 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-3xl bg-white shadow-2xl flex flex-col border border-slate-200/80">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 border-b bg-gradient-to-r from-indigo-50/50 via-white to-slate-50 px-6 py-4.5 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-200 shrink-0">
                <ClipboardList className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900 truncate">
                    {camelCaseText(form.title)}
                  </h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                    #{form.id}
                  </span>
                </div>
                {form.description ? (
                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    {form.description}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={onShare}
                className="h-8 text-xs font-bold text-indigo-700 border-indigo-200 bg-indigo-50/60 hover:bg-indigo-100 rounded-xl gap-1.5"
              >
                <Share2 className="h-3.5 w-3.5" />
                Share
              </Button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-3 px-6 py-3 border-b bg-slate-50/70 shrink-0 text-xs">
            <div className="flex items-center gap-1.5 text-slate-600">
              <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">Status:</span>
              <span className={`font-bold ${form.is_active ? "text-emerald-700" : "text-slate-500"}`}>
                {form.is_active ? "Published & Active" : "Inactive"}
              </span>
            </div>
            <div className="h-3 w-px bg-slate-200" />
            {form.fees_enable ? (
              <div className="flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5">
                <IndianRupee className="h-3 w-3" />
                <span>₹{form.fees}</span>
                <span className="text-emerald-600 text-[10px]">Application Fee</span>
              </div>
            ) : (
              <span className="text-slate-500 font-semibold bg-slate-100 rounded-full px-2.5 py-0.5">
                Free Admission
              </span>
            )}
            <div className="h-3 w-px bg-slate-200" />
            <div className="text-[11px] text-slate-500 font-medium">
              {(form.sections || []).length} Sections · {(form.sections || []).reduce((s, sec) => s + (sec.fields?.length || 0), 0)} Fields
            </div>
          </div>

          {/* Sections, Fields, Documents & Fees */}
          <div className="overflow-y-auto flex-1 px-6 py-4.5 space-y-4">
            {/* 1. Form Sections & Fields */}
            {(form.sections || []).map((section, index) => (
              <div
                key={section.id || `${section.title}-${index}`}
                className="rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs"
              >
                <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2.5">
                  <Layers className="h-3.5 w-3.5 text-indigo-600" />
                  <p className="font-bold text-slate-800 text-xs">
                    {section.title}
                  </p>
                  <span className="ml-auto text-[11px] font-semibold text-slate-400">
                    {section.fields?.length || 0} fields
                  </span>
                </div>
                <div className="divide-y divide-slate-100">
                  {(section.fields || []).map((field, fIdx) => (
                    <div
                      key={(field as any).id || `field-${fIdx}`}
                      className="flex items-center gap-3 px-4 py-2.5 group hover:bg-slate-50/60 transition-colors text-xs"
                    >
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 shrink-0">
                        <FileText className="h-3 w-3" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 truncate">
                          {field.label}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                          {field.field_type}
                        </span>

                        {Boolean(field.required || field.is_required) ? (
                          <span className="text-[10px] bg-red-50 text-red-600 border border-red-200 rounded-full px-2 py-0.5 font-bold">
                            Required
                          </span>
                        ) : (
                          <span className="text-[10px] bg-slate-100 text-slate-500 rounded-full px-2 py-0.5 font-medium">
                            Optional
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* 2. Document Fields */}
            {form.document_fields && form.document_fields.length > 0 ? (
              <div className="rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs">
                <div className="flex items-center gap-2 border-b border-purple-100 bg-purple-50/60 px-4 py-2.5">
                  <ClipboardList className="h-3.5 w-3.5 text-purple-600" />
                  <p className="font-bold text-slate-800 text-xs">
                    Required Document Uploads
                  </p>
                  <span className="ml-auto text-[11px] font-semibold text-slate-400">
                    {form.document_fields.length} items
                  </span>
                </div>
                <div className="divide-y divide-slate-100">
                  {form.document_fields.map((doc: any, docIdx: number) => {
                    const label = typeof doc === "string" ? doc : doc.label;
                    return (
                      <div
                        key={doc.id || `doc-${docIdx}`}
                        className="flex items-center justify-between px-4 py-2.5 hover:bg-purple-50/30 transition-colors text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-purple-100 text-purple-700 shrink-0">
                            <FileText className="h-3 w-3" />
                          </div>
                          <span className="font-semibold text-slate-800">
                            {label}
                          </span>
                        </div>
                        <span className="text-[10px] bg-purple-50 text-purple-700 border border-purple-200 rounded-full px-2.5 py-0.5 font-bold">
                          Document Upload
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {/* 3. Fee Structures */}
            {(form as any).fee_structures && (form as any).fee_structures.length > 0 ? (
              <div className="rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs">
                <div className="flex items-center gap-2 border-b border-emerald-100 bg-emerald-50/60 px-4 py-2.5">
                  <IndianRupee className="h-3.5 w-3.5 text-emerald-600" />
                  <p className="font-bold text-slate-800 text-xs">
                    Class-wise Fee Structure
                  </p>
                </div>
                <div className="p-3 grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-50/30">
                  {(form as any).fee_structures.map((fee: any, fIdx: number) => (
                    <div
                      key={`fee-${fIdx}`}
                      className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs shadow-2xs"
                    >
                      <span className="font-semibold text-slate-800">{fee.class_label || fee.class_code || `Class #${fee.class_name}`}</span>
                      <span className="font-bold text-emerald-700">₹{fee.fee_amount}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Create Form Modal ────────────────────────────────────────────────────────
function CreateFormModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (form: AdmissionFormResponse) => void;
}) {
  const handleSuccess = (form: AdmissionFormResponse) => {
    onCreated(form);
    setTimeout(() => {
      onClose();
    }, 1600);
  };

  return (
    <AnimatePresence mode="wait">
      <ModalBackdrop key="modal-backdrop" onClick={onClose} />

      <motion.div
        key="create-form-modal"
        initial={{ opacity: 0, scale: 0.97, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 16 }}
        transition={{ type: "spring", stiffness: 340, damping: 30 }}
        className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-5 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative w-full max-w-5xl my-4 sm:my-8 shadow-2xl rounded-2xl">
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="absolute top-3.5 right-3.5 z-20 flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white border border-white/20 backdrop-blur-xs transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          <PrincipalFormBuilder onSuccess={handleSuccess} />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50 border border-teal-100 mb-4 shadow-xs">
        <FileText className="h-8 w-8 text-[#147d73]" />
      </div>
      <h3 className="text-base font-bold text-slate-800 mb-1">
        No admission forms created yet
      </h3>
      <p className="text-xs text-slate-500 max-w-xs mb-6">
        Create an online admission form to start accepting student applications with custom fields and document uploads.
      </p>
      <Button onClick={onCreateClick} className="gap-2 bg-[#173044] hover:bg-[#25495e] text-white rounded-xl shadow-xs text-xs font-bold px-4 py-2">
        <Plus className="h-4 w-4" />
        Create Admission Form
      </Button>
    </motion.div>
  );
}

// ─── Form Table Row ───────────────────────────────────────────────────────────
function FormTableRow({
  form,
  index,
  onView,
  onShare,
  onDelete,
  onPublishToggle,
  isToggling = false,
  isDeleting = false,
}: {
  form: AdmissionFormResponse;
  index: number;
  onView: () => void;
  onShare: () => void;
  onDelete: () => void;
  onPublishToggle: (formId: number, currentStatus: boolean) => void;
  isToggling?: boolean;
  isDeleting?: boolean;
}) {
  const totalFields = (form.sections || []).reduce(
    (sum, s) => sum + (s.fields?.length || 0),
    0
  );

  return (
    <motion.tr
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="group hover:bg-indigo-50/40 transition-colors"
    >
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 shrink-0 group-hover:bg-indigo-100 transition-colors">
            <ClipboardList className="h-4 w-4" />
          </div>
          <div>
            <p className="font-bold text-slate-900 text-xs sm:text-sm leading-tight group-hover:text-indigo-600 transition-colors">
              {camelCaseText(form.title)}
            </p>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              ID #{form.id}
            </p>
          </div>
        </div>
      </td>
      <td className="px-5 py-3.5">
        {form.description ? (
          <p className="text-xs text-slate-600 line-clamp-1 max-w-xs font-medium">
            {form.description}
          </p>
        ) : (
          <span className="text-xs text-slate-400 italic">No description</span>
        )}
      </td>
      <td className="px-5 py-3.5">
        {form.fees_enable ? (
          <div className="flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200/80 rounded-full px-2.5 py-0.5 w-fit">
            <IndianRupee className="h-3 w-3" />
            <span className="text-xs font-bold">{form.fees}</span>
          </div>
        ) : (
          <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 rounded-full px-2.5 py-0.5">
            Free
          </span>
        )}
      </td>
      <td className="px-5 py-3.5">
        <div className="flex flex-wrap gap-1">
          {(form.sections || []).map((s, idx) => (
            <span
              key={s.id || `sec-${idx}`}
              className="text-[10px] bg-slate-100 text-slate-700 rounded-md px-1.5 py-0.5 font-semibold"
            >
              {s.title}
            </span>
          ))}
        </div>
        <p className="text-[10px] text-slate-400 font-medium mt-0.5">
          {totalFields} total fields
        </p>
      </td>
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-2">
          <Switch
            checked={form.is_active}
            onCheckedChange={() => onPublishToggle(form.id, form.is_active)}
            disabled={isToggling}
          />
          <span
            className={`text-xs font-bold ${
              form.is_active ? "text-teal-700" : "text-slate-400"
            }`}
          >
            {form.is_active ? "Active" : "Inactive"}
          </span>
        </div>
      </td>
      <td className="px-5 py-3.5 text-right">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onShare}
            className="h-8 px-2 text-xs font-bold text-teal-700 hover:bg-teal-50 hover:text-teal-800 rounded-lg gap-1"
            title="Share Link & QR"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Share</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onView}
            className="h-8 w-8 p-0 text-slate-500 hover:text-teal-700 hover:bg-teal-50 rounded-lg"
            title="View Details"
          >
            <Eye className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            disabled={isDeleting}
            className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-40"
            title="Delete Form"
          >
            {isDeleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </td>
    </motion.tr>
  );
}

// ─── Published Link Banner Card ───────────────────────────────────────────────
function PublishedLinkBanner({
  link,
  form,
  onOpenShare,
}: {
  link: string;
  form?: AdmissionFormResponse;
  onOpenShare: () => void;
}) {
  const uniqueLink = link.split("/").filter(Boolean).pop();
  const [origin, setOrigin] = useState("");
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);
  const frontendLink = `${origin}/form/${uniqueLink}`;
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(frontendLink);
    setCopied(true);
    toast.success("Public admission link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const shareWhatsApp = () => {
    const text = encodeURIComponent(
      `🎓 *Online Admission Open*\nPlease fill out the school admission form online using this link:\n${frontendLink}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  };

  if (!link) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs hover:shadow-sm transition-all"
    >
      <div className="absolute top-0 right-0 -mr-16 -mt-16 h-48 w-48 rounded-full bg-teal-500/5 blur-3xl pointer-events-none" />

      <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#173044] text-white shadow-md shrink-0">
            <ExternalLink className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-tight">
                Published Admission Portal
              </h3>
              <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live & Active
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Parents and prospective students can apply online anytime.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Link Box */}
          <div className="relative flex-1 sm:w-[280px] lg:w-[320px]">
            <div className="h-9 flex items-center rounded-xl border border-slate-200 bg-slate-50/70 pl-3 pr-8 font-mono text-[11px] text-slate-600 overflow-hidden whitespace-nowrap">
              <span className="truncate">{frontendLink}</span>
            </div>
            <button
              onClick={handleCopy}
              className="absolute right-1 top-1 h-7 w-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-teal-700 hover:bg-white transition-all shadow-2xs"
              title="Copy link"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>

          {/* QR Code & Share Button */}
          <Button
            size="sm"
            variant="outline"
            onClick={onOpenShare}
            className="h-9 px-3 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold gap-1.5 shadow-2xs"
            title="Generate QR Code"
          >
            <QrCode className="h-3.5 w-3.5 text-teal-700" />
            <span>QR & Share</span>
          </Button>

          {/* WhatsApp Direct Share */}
          <Button
            size="sm"
            variant="outline"
            onClick={shareWhatsApp}
            className="h-9 px-3 rounded-xl border-emerald-200 bg-emerald-50/50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold gap-1.5 shadow-2xs"
            title="Share to WhatsApp"
          >
            <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
            <span className="hidden sm:inline">WhatsApp</span>
          </Button>

          {/* Live Preview Button */}
          <Button
            size="sm"
            onClick={() => window.open(frontendLink, "_blank")}
            className="h-9 px-3.5 rounded-xl office-primary text-white text-xs font-bold gap-1.5 shadow-xs"
          >
            Preview Form
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdmissionFormPage() {
  const [forms, setForms] = useState<AdmissionFormResponse[]>([]);
  const [formLink, setFormLink] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [viewForm, setViewForm] = useState<AdmissionFormResponse | null>(null);
  const [shareForm, setShareForm] = useState<AdmissionFormResponse | null>(null);
  const [confirmDeleteForm, setConfirmDeleteForm] = useState<AdmissionFormResponse | null>(null);
  const [successBanner, setSuccessBanner] = useState("");
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const fetchForms = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [data, linkData] = await Promise.all([
        getAdmissionForms(),
        getPublishedFormLink().catch(() => ({ form_link: "" })),
      ]);

      const sortedForms = [...data].sort((a, b) => {
        if (a.is_active && !b.is_active) return -1;
        if (!a.is_active && b.is_active) return 1;
        return a.id - b.id;
      });

      setForms(sortedForms);
      const hasActive = sortedForms.some((f) => f.is_active);
      setFormLink(hasActive && linkData.form_link ? linkData.form_link : "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load forms.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchForms();
  }, [fetchForms]);

  const handleCreated = async (createdForm: AdmissionFormResponse) => {
    await fetchForms();
    setSuccessBanner(
      `Form "${createdForm?.title || "Admission Form"}" was created successfully!`
    );
    setTimeout(() => {
      setSuccessBanner("");
    }, 5000);
  };

  const handlePublishToggle = async (
    formId: number,
    currentStatus: boolean
  ) => {
    if (togglingId !== null) return;
    setTogglingId(formId);

    try {
      const updatedStatus = !currentStatus;
      await toggleFormStatus(formId, updatedStatus);
      toast.success("Form status updated successfully");
      await fetchForms();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update form status"
      );
    } finally {
      setTogglingId(null);
    }
  };

  const handleDeleteForm = async (form: AdmissionFormResponse) => {
    setDeletingId(form.id);
    try {
      await deleteAdmissionForm(form.id);
      toast.success(`Form "${form.title}" deleted successfully`);
      await fetchForms();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete form");
    } finally {
      setDeletingId(null);
      setConfirmDeleteForm(null);
    }
  };

  // Filtered forms
  const filteredForms = forms.filter((f) => {
    const matchesSearch =
      (f.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.description || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(f.id).includes(searchQuery);

    if (!matchesSearch) return false;
    if (statusFilter === "active") return f.is_active;
    if (statusFilter === "inactive") return !f.is_active;
    return true;
  });

  const activeForm = forms.find((f) => f.is_active) || forms[0] || null;

  return (
    <>
      <div className="clerk-page admission-page space-y-6 max-w-7xl mx-auto">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="office-eyebrow">
              <span>Admission Desk</span>
              <span>/</span>
              <span>Online Forms</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Admission Forms<span className="heading-dot">.</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Create, customize, and share online admission forms for prospective students.
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchForms}
              disabled={loading}
              className="h-9 text-xs font-semibold gap-1.5 border-slate-200 text-slate-700 shadow-2xs"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            <Button
              onClick={() => setCreateOpen(true)}
              className="h-9 text-xs font-bold gap-1.5 office-primary text-white rounded-xl shadow-xs"
            >
              <Plus className="h-4 w-4" />
              Create Form
            </Button>
          </div>
        </div>

        {/* Success banner */}
        <AnimatePresence>
          {successBanner ? (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="hr-success"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>{successBanner}</span>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Error banner */}
        <AnimatePresence>
          {error ? (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="hr-error flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                <span>{error}</span>
              </div>
              <button
                onClick={fetchForms}
                className="text-xs underline underline-offset-2 hover:no-underline font-bold"
              >
                Retry
              </button>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Summary Stats Strip */}
        {!loading && forms.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                label: "Total Forms",
                value: forms.length,
                subtext: "Configured templates",
                icon: FileText,
              },
              {
                label: "Published & Live",
                value: forms.filter((f) => f.is_active).length,
                subtext: "Open for applications",
                icon: CheckCircle2,
              },
              {
                label: "With Fees",
                value: forms.filter((f) => f.fees_enable).length,
                subtext: "Fee collected online",
                icon: IndianRupee,
              },
              {
                label: "Form Sections",
                value: forms.reduce(
                  (sum, f) => sum + (f.sections?.length || 0),
                  0
                ),
                subtext: "Modular field blocks",
                icon: Layers,
              },
            ].map(({ label, value, subtext, icon: Icon }) => (
              <div
                key={label}
                className="register-stat"
              >
                <div className="stat-label">
                  <span>{label}</span>
                  <Icon className="h-4 w-4" />
                </div>
                <p className="stat-value text-2xl font-bold mt-2">
                  {value}
                </p>
                <p className="stat-caption text-[11px] text-slate-400 mt-1">{subtext}</p>
              </div>
            ))}
          </div>
        ) : null}

        {/* Active Published Link Banner */}
        {!loading && formLink ? (
          <PublishedLinkBanner
            link={formLink}
            form={activeForm || undefined}
            onOpenShare={() => setShareForm(activeForm)}
          />
        ) : null}

        {/* Main Table Container */}
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-2xs overflow-hidden">
          {/* Table Controls (Search & Filters) */}
          {!loading && forms.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 border-b border-slate-100 bg-slate-50/40">
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search forms by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8.5 pl-8 text-xs bg-white border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex items-center gap-1.5">
                {(["all", "active", "inactive"] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setStatusFilter(filter)}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all capitalize ${
                      statusFilter === filter
                        ? "bg-[#173044] text-white shadow-2xs"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
              <p className="text-xs text-slate-400 font-medium">Loading admission forms…</p>
            </div>
          ) : forms.length === 0 ? (
            <EmptyState onCreateClick={() => setCreateOpen(true)} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70">
                    {[
                      "Form Title",
                      "Description",
                      "Fees",
                      "Sections & Fields",
                      "Publish Status",
                      "Actions",
                    ].map((h) => (
                      <th
                        key={h}
                        className={`px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 ${
                          h === "Actions" ? "text-right" : ""
                        }`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredForms.map((form, idx) => (
                    <FormTableRow
                      key={form.id || `form-${idx}`}
                      form={form}
                      index={idx}
                      onView={() => setViewForm(form)}
                      onShare={() => setShareForm(form)}
                      onDelete={() => setConfirmDeleteForm(form)}
                      onPublishToggle={handlePublishToggle}
                      isToggling={togglingId === form.id}
                      isDeleting={deletingId === form.id}
                    />
                  ))}
                  {filteredForms.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-slate-400 text-xs">
                        No forms found matching &quot;{searchQuery}&quot;
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Share & QR Code Modal */}
      {shareForm && (
        <ShareQrModal
          form={shareForm}
          link={
            formLink ||
            (typeof window !== "undefined"
              ? `${window.location.origin}/form/${shareForm.unique_link}`
              : "")
          }
          onClose={() => setShareForm(null)}
        />
      )}

      {/* Create Form Modal */}
      {createOpen ? (
        <CreateFormModal
          onClose={() => setCreateOpen(false)}
          onCreated={handleCreated}
        />
      ) : null}

      {/* View Form Details Modal */}
      {viewForm ? (
        <FormDetailsModal
          form={viewForm}
          onClose={() => setViewForm(null)}
          onShare={() => {
            setShareForm(viewForm);
            setViewForm(null);
          }}
        />
      ) : null}

      {/* Delete Confirmation Modal */}
      {confirmDeleteForm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <ModalBackdrop onClick={() => setConfirmDeleteForm(null)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative z-50 w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200"
          >
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <div className="p-2.5 bg-red-50 rounded-2xl shrink-0">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 leading-tight">
                  Delete Admission Form
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 mb-6 leading-relaxed">
              Are you sure you want to permanently delete{" "}
              <strong className="text-slate-900 font-semibold">
                {confirmDeleteForm.title}
              </strong>
              ? Any incomplete inquiries or admission drafts linked to this form will also be archived.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmDeleteForm(null)}
                disabled={deletingId === confirmDeleteForm.id}
                className="h-9 px-4 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDeleteForm(confirmDeleteForm)}
                disabled={deletingId === confirmDeleteForm.id}
                className="h-9 px-4 rounded-xl gap-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md shadow-red-200"
              >
                {deletingId === confirmDeleteForm.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                Delete Form
              </Button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </>
  );
}
