"use client";

import { use, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Copy,
  ExternalLink,
  FileCheck,
  FileText,
  HelpCircle,
  IndianRupee,
  Info,
  Lock,
  Mail,
  MapPin,
  Phone,
  Printer,
  Share2,
  Sparkles,
  UploadCloud,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { API_BASE_URL } from "@/lib/config";
import { toast } from "sonner";

interface FormFieldItem {
  id: number | string;
  label: string;
  field_type: string;
  required?: boolean;
  is_required?: boolean;
  options?: Array<{ label?: string; value?: string } | string>;
  order?: number;
}

interface FormSectionItem {
  id: number | string;
  title: string;
  order: number;
  fields: FormFieldItem[];
}

interface FeeStructureItem {
  class_name: number | string;
  class_name_display?: string;
  fee_amount: number | string | null;
}

interface DocumentFieldItem {
  id: number | string;
  label: string;
  is_required?: boolean;
  order?: number;
}

interface FormPreviewData {
  id: number;
  unique_link: string;
  title: string;
  description: string | null;
  academic_year?: number | string | null;
  is_active: boolean;
  fees_enable: boolean;
  fee_type?: string;
  fees?: number | string | null;
  fee_structures?: FeeStructureItem[];
  sections?: FormSectionItem[];
  document_fields?: DocumentFieldItem[];
  school_id: number;
  school_slug: string;
  school_name?: string;
  school_code?: string;
  school_email?: string;
  school_phone?: string;
  school_address?: string;
  school_city?: string;
  school_state?: string;
  school_pincode?: string;
  school_logo?: string | null;
}

export default function AdmissionFormPreviewPage({
  params,
}: {
  params: Promise<{ uniqueLink: string }>;
}) {
  const { uniqueLink } = use(params);
  const [formData, setFormData] = useState<FormPreviewData | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchFormDetails = async () => {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const url = new URL(`/api/admission/${uniqueLink}/`, API_BASE_URL).toString();
        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok) {
          setErrorMessage(data?.message || "The admission form link is invalid or closed.");
          setIsLoading(false);
          return;
        }

        // Cache school credentials
        if (data?.school_id) {
          localStorage.setItem("school_id", String(data.school_id));
        }
        if (data?.school_slug) {
          localStorage.setItem("school_slug", data.school_slug);
        }

        setFormData(data);
      } catch (err) {
        console.error("Failed to load admission form:", err);
        setErrorMessage("We encountered an error loading the admission form. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchFormDetails();
  }, [uniqueLink]);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success("Admission link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleApply = () => {
    if (formData?.school_id) {
      localStorage.setItem("school_id", String(formData.school_id));
    }
    if (formData?.school_slug) {
      localStorage.setItem("school_slug", formData.school_slug);
    }
    window.location.href = "/signup";
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  // ─── Loading View ────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#F8FAFC] relative overflow-hidden px-4">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-100 rounded-full blur-[120px] opacity-60" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-100 rounded-full blur-[120px] opacity-60" />

        <div className="relative z-10 bg-white/90 backdrop-blur-xl border border-white/80 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] rounded-[2rem] p-10 max-w-md w-full text-center">
          <div className="relative size-16 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-indigo-100 rounded-full" />
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="absolute inset-0 border-4 border-indigo-600 border-t-transparent rounded-full"
            />
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Loading Admission Form</h2>
          <p className="text-slate-500 text-sm mt-1.5 font-medium">Fetching school information and form structure...</p>
        </div>
      </div>
    );
  }

  // ─── Error View ──────────────────────────────────────────────────────────────
  if (errorMessage || !formData) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#F8FAFC] relative overflow-hidden px-4">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-rose-100 rounded-full blur-[120px] opacity-50" />
        <div className="relative z-10 w-full max-w-[480px]">
          <div className="bg-white/90 backdrop-blur-xl border border-white/80 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] rounded-[2.5rem] p-8 md:p-10 text-center">
            <div className="size-18 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner text-rose-500">
              <AlertCircle size={38} />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">
              Admission Link <span className="text-rose-500">Unavailable</span>
            </h1>
            <div className="mt-4 p-4 bg-rose-50/60 rounded-2xl border border-rose-100 text-slate-600 text-sm font-semibold">
              {errorMessage || "The link you followed may be expired or inactive."}
            </div>
            <p className="text-slate-400 mt-4 text-xs font-medium leading-relaxed">
              If you believe this is an error, please get in touch with the school administration for a verified admission link.
            </p>
            <div className="mt-8 flex flex-col gap-2.5">
              <Button
                onClick={() => window.location.reload()}
                className="w-full bg-slate-900 hover:bg-indigo-600 text-white rounded-xl h-12 font-bold transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw size={16} />
                Try Again
              </Button>
              <Link href="/">
                <Button variant="outline" className="w-full rounded-xl h-11 text-xs font-bold border-slate-200 text-slate-600">
                  Return to Homepage
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Computations ────────────────────────────────────────────────────────────
  const sections = formData.sections || [];
  const documentFields = formData.document_fields || [];
  const feeStructures = formData.fee_structures || [];
  const isPerClassFee =
    String(formData.fee_type || "").toLowerCase() === "individual" ||
    String(formData.fee_type || "").toLowerCase() === "per_class" ||
    feeStructures.length > 0;

  const totalFields = sections.reduce((acc, s) => acc + (s.fields?.length || 0), 0);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans pb-24">
      {/* ── Top Bar ──────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {formData.school_logo ? (
              <img
                src={formData.school_logo}
                alt={formData.school_name || "School"}
                className="h-10 w-10 rounded-xl object-contain border border-slate-200 bg-white p-1 shrink-0"
              />
            ) : (
              <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white font-black text-sm shrink-0 shadow-sm shadow-indigo-500/20">
                <Building2 className="h-5 w-5" />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="font-extrabold text-sm sm:text-base text-slate-900 leading-tight truncate">
                {formData.school_name || "School Admission Portal"}
              </h1>
              <p className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5 truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                Official Online Admission Form
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="h-9 px-3 rounded-xl border-slate-200 text-xs font-bold gap-1.5 hover:bg-slate-50"
              title="Copy public link"
            >
              <Share2 className="h-3.5 w-3.5 text-indigo-600" />
              <span className="hidden sm:inline">{copied ? "Copied!" : "Share Link"}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="h-9 px-3 rounded-xl border-slate-200 text-xs font-bold gap-1.5 hover:bg-slate-50 hidden md:flex"
              title="Print preview"
            >
              <Printer className="h-3.5 w-3.5 text-slate-600" />
              <span>Print</span>
            </Button>
            <Button
              size="sm"
              onClick={handleApply}
              className="h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold gap-1.5 shadow-sm shadow-indigo-600/20"
            >
              <span>Apply Online</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </header>

      {/* ── Main Container ───────────────────────────────────────────────────── */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 space-y-6">
        {/* Preview Banner */}
        <div className="rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50 via-purple-50/50 to-white p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-extrabold text-indigo-950 uppercase tracking-wider">
                Admission Portal Preview
              </p>
              <p className="text-xs text-indigo-700 font-medium">
                This is the official public admission form for applicants and parents.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-300 font-bold text-[10px] px-2.5 py-0.5">
              Live & Accepting Applications
            </Badge>
          </div>
        </div>

        {/* ── Form Header Hero Card ─────────────────────────────────────────── */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 h-40 w-40 rounded-full bg-indigo-500/5 blur-2xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 font-bold text-[11px] px-2.5 py-0.5">
                  Academic Year: {formData.academic_year ? String(formData.academic_year) : "2026 - 2027"}
                </Badge>
                <span className="text-[11px] font-mono font-bold text-slate-400">
                  Form #{formData.id}
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2 tracking-tight">
                {formData.title || "Student Admission Form"}
              </h2>
              {formData.description ? (
                <p className="text-slate-600 text-xs sm:text-sm mt-1.5 font-medium leading-relaxed max-w-2xl">
                  {formData.description}
                </p>
              ) : null}
            </div>

            {/* School Contact Card */}
            {(formData.school_phone || formData.school_email || formData.school_city) && (
              <div className="sm:text-right text-xs text-slate-500 space-y-1 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100 min-w-[200px]">
                {formData.school_phone && (
                  <p className="flex items-center sm:justify-end gap-1.5 font-medium">
                    <Phone className="h-3 w-3 text-slate-400" />
                    <span>{formData.school_phone}</span>
                  </p>
                )}
                {formData.school_email && (
                  <p className="flex items-center sm:justify-end gap-1.5 font-medium">
                    <Mail className="h-3 w-3 text-slate-400" />
                    <span>{formData.school_email}</span>
                  </p>
                )}
                {(formData.school_city || formData.school_state) && (
                  <p className="flex items-center sm:justify-end gap-1.5 font-medium">
                    <MapPin className="h-3 w-3 text-slate-400" />
                    <span>{[formData.school_city, formData.school_state].filter(Boolean).join(", ")}</span>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6">
            <div className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-100">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sections</p>
              <p className="text-lg font-black text-slate-900 mt-0.5">{sections.length}</p>
            </div>
            <div className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-100">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Fields</p>
              <p className="text-lg font-black text-slate-900 mt-0.5">{totalFields}</p>
            </div>
            <div className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-100">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Documents</p>
              <p className="text-lg font-black text-slate-900 mt-0.5">{documentFields.length} Required</p>
            </div>
            <div className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-100">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Application Fee</p>
              <p className="text-lg font-black text-indigo-600 mt-0.5">
                {!formData.fees_enable
                  ? "Free"
                  : isPerClassFee
                  ? "Per Class"
                  : `₹${formData.fees != null ? formData.fees : "0"}`}
              </p>
            </div>
          </div>
        </div>

        {/* ── Fee Structure Details (if enabled) ─────────────────────────────── */}
        {formData.fees_enable ? (
          <div className="rounded-3xl border border-blue-200/80 bg-blue-50/40 p-6 shadow-2xs">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="h-8 w-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                <IndianRupee className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-blue-950">
                  {isPerClassFee ? "Class-wise Application Fee Structure" : "Application Fee Structure"}
                </h3>
                <p className="text-xs text-blue-700/80 font-medium">
                  {isPerClassFee
                    ? "Application fee depends on the class selected during student admission."
                    : "Standard application fee applicable to all applying students."}
                </p>
              </div>
            </div>

            {isPerClassFee && feeStructures.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 mt-4">
                {feeStructures.map((fs, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl bg-white border border-blue-200/80 shadow-2xs"
                  >
                    <span className="text-xs font-bold text-slate-700">
                      {fs.class_name_display || `Class #${fs.class_name}`}
                    </span>
                    <span className="text-xs font-extrabold text-blue-700">
                      ₹{fs.fee_amount != null ? fs.fee_amount : "0"}
                    </span>
                  </div>
                ))}
              </div>
            ) : !isPerClassFee ? (
              <div className="mt-2 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white border border-blue-200 font-extrabold text-blue-900 text-sm">
                <span>Application Fee:</span>
                <span className="text-emerald-700 font-black">₹{formData.fees != null ? formData.fees : "0"}</span>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* ── Sections & Fields Preview ─────────────────────────────────────── */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-slate-900">Application Form Fields</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Students/Parents will be asked to complete the following sections and fields.
              </p>
            </div>
            <span className="text-xs font-bold text-slate-400">
              {sections.length} {sections.length === 1 ? "Section" : "Sections"}
            </span>
          </div>

          {sections.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <ClipboardList className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-700">No Custom Fields Configured</p>
              <p className="text-xs text-slate-400 mt-1">
                Standard student details will be gathered during the application process.
              </p>
            </div>
          ) : (
            sections.map((section, sIdx) => (
              <motion.div
                key={section.id || sIdx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: sIdx * 0.05 }}
                className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs"
              >
                <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700 text-xs font-extrabold border border-indigo-100">
                    {sIdx + 1}
                  </span>
                  <div>
                    <h4 className="font-extrabold text-sm sm:text-base text-slate-900">
                      {section.title || `Section ${sIdx + 1}`}
                    </h4>
                    <p className="text-[11px] text-slate-400 font-medium">
                      {section.fields?.length || 0} fields in this section
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-5">
                  {(section.fields || []).map((field, fIdx) => {
                    const isRequired = Boolean(field.required ?? field.is_required);
                    const fieldType = (field.field_type || "text").toLowerCase();

                    return (
                      <div
                        key={field.id || fIdx}
                        className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                            <span>{field.label}</span>
                            {isRequired ? (
                              <span className="text-rose-500 font-black" title="Required">*</span>
                            ) : null}
                          </label>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            isRequired
                              ? "bg-rose-50 text-rose-600 border border-rose-100"
                              : "bg-slate-100 text-slate-500"
                          }`}>
                            {isRequired ? "Required" : "Optional"}
                          </span>
                        </div>

                        {/* Interactive UI Mock for Field Type */}
                        {fieldType === "select" || fieldType === "dropdown" ? (
                          <div className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 flex items-center justify-between text-xs text-slate-400 font-medium shadow-2xs">
                            <span>
                              {field.options && field.options.length > 0
                                ? `Select option (${field.options.length} options)`
                                : "Select..."}
                            </span>
                            <span className="text-slate-400">▾</span>
                          </div>
                        ) : fieldType === "date" ? (
                          <div className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 flex items-center justify-between text-xs text-slate-400 font-medium shadow-2xs">
                            <span>DD / MM / YYYY</span>
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          </div>
                        ) : fieldType === "textarea" ? (
                          <div className="h-16 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-400 font-medium shadow-2xs">
                            Enter details...
                          </div>
                        ) : (
                          <div className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 flex items-center text-xs text-slate-400 font-medium shadow-2xs">
                            {field.label ? `Enter ${field.label.toLowerCase()}...` : "Enter value..."}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* ── Required Documents Section ────────────────────────────────────── */}
        {documentFields.length > 0 ? (
          <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700 border border-amber-200/80">
                <UploadCloud className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                  Required Document Uploads
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Scanned copies must be provided during the application submission.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-5">
              {documentFields.map((doc, dIdx) => (
                <div
                  key={doc.id || dIdx}
                  className="flex items-center gap-3 p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/60"
                >
                  <div className="h-9 w-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-indigo-600 shrink-0 shadow-2xs">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {doc.label}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium">PDF, JPG, PNG (Max 3MB)</p>
                  </div>
                  <Badge className="bg-rose-50 text-rose-600 border-rose-200 text-[10px] font-bold px-2 py-0.5 shrink-0">
                    Required
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* ── Instructions Card ──────────────────────────────────────────────── */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs">
          <div className="flex items-center gap-2.5 mb-4">
            <Info className="h-4 w-4 text-indigo-600" />
            <h4 className="font-extrabold text-sm text-slate-900">Application Guidelines & Next Steps</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="font-black text-indigo-600 text-sm">Step 1</span>
              <p className="font-bold text-slate-900 mt-1">Create Account & Verify</p>
              <p className="text-slate-500 mt-1 leading-relaxed">
                Provide your mobile number or email address to receive an instant verification OTP.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="font-black text-indigo-600 text-sm">Step 2</span>
              <p className="font-bold text-slate-900 mt-1">Complete Student Profile</p>
              <p className="text-slate-500 mt-1 leading-relaxed">
                Fill out the applicant details, parent information, and upload all required documents.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="font-black text-indigo-600 text-sm">Step 3</span>
              <p className="font-bold text-slate-900 mt-1">Submit & Track</p>
              <p className="text-slate-500 mt-1 leading-relaxed">
                Pay application fees (if applicable), get your unique admission number, and track status.
              </p>
            </div>
          </div>
        </div>

        {/* ── Bottom Action Card ────────────────────────────────────────────── */}
        <div className="rounded-3xl bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 text-white p-8 sm:p-10 shadow-xl relative overflow-hidden text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="relative z-10 max-w-lg">
            <h3 className="text-2xl font-black tracking-tight leading-tight">
              Ready to submit your application?
            </h3>
            <p className="text-indigo-200 text-xs sm:text-sm mt-1.5 leading-relaxed font-medium">
              Start your online admission application in a few simple steps. Save progress and resume anytime.
            </p>
          </div>
          <div className="relative z-10 flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <Button
              onClick={handleApply}
              className="w-full sm:w-auto h-12 px-6 rounded-2xl bg-indigo-500 hover:bg-indigo-400 text-white font-extrabold text-sm gap-2 shadow-lg shadow-indigo-500/25 transition-all"
            >
              <span>Start Application</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Link href="/login" className="w-full sm:w-auto">
              <Button
                variant="outline"
                className="w-full sm:w-auto h-12 px-5 rounded-2xl border-white/20 bg-white/10 hover:bg-white/20 text-white font-bold text-xs"
              >
                Sign In Instead
              </Button>
            </Link>
          </div>
        </div>
      </main>

      {/* Brand Footer */}
      <footer className="mt-12 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">
        Powered by <span className="text-indigo-600">VidyaSanchalan</span> ERP Platform
      </footer>
    </div>
  );
}
