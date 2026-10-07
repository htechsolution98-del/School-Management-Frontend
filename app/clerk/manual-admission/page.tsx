"use client";

import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  UserPlus,
  User,
  Users,
  GraduationCap,
  Calendar,
  Phone,
  MapPin,
  FileText,
  Building2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Sparkles,
  UploadCloud,
  FileCheck,
  ClipboardList,
  X,
  RotateCcw,
  Cake,
  Mail,
  ShieldCheck,
  Check,
  PlusCircle,
  Info,
  Eye,
  Trash2,
  Download,
  Upload,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Image as ImageIcon,
} from "lucide-react";

import { fetchWithAuth } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";

import { AdmissionFieldInput } from "@/components/clerk/admission-field";
import { BulkAdmissionImport } from "@/components/clerk/bulk-admission-import";
import { admissionFields, normalizeAdmissionValue, validateAdmissionField, validateAdmissionFile, isBirthField, type AdmissionConfig, type AdmissionField } from "@/lib/admission-validation";
import { submitAdmission } from "@/lib/clerk/admission-submit";
import "../clerk-workspace.css";

type FormField = AdmissionField;
type AdmissionForm = AdmissionConfig;

interface SchoolClass {
  id: number;
  school_class: string;
  name?: string;
}

interface AcademicYear {
  id: number;
  name: string;
  is_active?: boolean;
}

// Helper: Format string to Title Case
function toTitleCase(str: string): string {
  if (!str) return "";
  return str
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((word) => {
      // Keep acronyms like RTE, TC, GR, DOB uppercase
      if (/^(rte|tc|gr|dob|id|pen|apaar|abc)$/i.test(word)) {
        return word.toUpperCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

// Helper: Live Age Calculator
function calculateAge(dobStr: string): {
  years: number;
  months: number;
  days: number;
  text: string;
  valid: boolean;
  error?: string;
} {
  if (!dobStr) return { years: 0, months: 0, days: 0, text: "", valid: true };
  const birthDate = new Date(dobStr);
  if (isNaN(birthDate.getTime())) {
    return { years: 0, months: 0, days: 0, text: "", valid: false, error: "Invalid date format" };
  }

  const today = new Date();
  if (birthDate > today) {
    return { years: 0, months: 0, days: 0, text: "", valid: false, error: "Date of birth cannot be in the future" };
  }

  let years = today.getFullYear() - birthDate.getFullYear();
  let months = today.getMonth() - birthDate.getMonth();
  let days = today.getDate() - birthDate.getDate();

  if (days < 0) {
    months -= 1;
    const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    days += prevMonth.getDate();
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const parts: string[] = [];
  if (years > 0) parts.push(`${years} ${years === 1 ? "Yr" : "Yrs"}`);
  if (months > 0 || years === 0) parts.push(`${months} ${months === 1 ? "Mo" : "Mos"}`);

  return {
    years,
    months,
    days,
    text: parts.join(", ") || "0 Mos",
    valid: true,
  };
}

const isDobField = isBirthField;

function getSectionIcon(title: string) {
  const t = title.toLowerCase();
  if (t.includes("academic") || t.includes("class") || t.includes("course") || t.includes("stream")) {
    return <GraduationCap className="h-4 w-4 text-teal-700" />;
  }
  if (t.includes("parent") || t.includes("guardian") || t.includes("family") || t.includes("father") || t.includes("mother")) {
    return <Users className="h-4 w-4 text-slate-700" />;
  }
  if (t.includes("address") || t.includes("location") || t.includes("contact") || t.includes("residence")) {
    return <MapPin className="h-4 w-4 text-teal-700" />;
  }
  if (t.includes("previous") || t.includes("school") || t.includes("transfer") || t.includes("history")) {
    return <Building2 className="h-4 w-4 text-amber-700" />;
  }
  if (t.includes("personal") || t.includes("student") || t.includes("identity") || t.includes("basic")) {
    return <User className="h-4 w-4 text-[#173044]" />;
  }
  return <ClipboardList className="h-4 w-4 text-slate-700" />;
}

// ─── Document File Thumbnail ──────────────────────────────────────────────────
function DocumentFileThumbnail({
  file,
  title,
  onPreview,
  onChangeClick,
  onRemove,
}: {
  file: File;
  title: string;
  onPreview: () => void;
  onChangeClick: () => void;
  onRemove: () => void;
}) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const isPdf = file.name.toLowerCase().endsWith(".pdf") || file.type === "application/pdf";
  const isImg = file.type.startsWith("image/") || /\.(png|jpe?g|webp|gif|svg)$/i.test(file.name);

  useEffect(() => {
    if (isImg) {
      const url = URL.createObjectURL(file);
      setThumbnailUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setThumbnailUrl(null);
  }, [file, isImg]);

  return (
    <div className="space-y-2.5">
      <div
        onClick={onPreview}
        className="group relative flex items-center gap-3 p-2.5 rounded-xl border border-teal-100 bg-white hover:border-teal-300 dark:bg-zinc-800 dark:border-zinc-700 cursor-pointer transition-all shadow-2xs"
        title="Click to view full preview"
      >
        {isImg && thumbnailUrl ? (
          <div className="relative size-14 shrink-0 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center">
            <img
              src={thumbnailUrl}
              alt={title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
              <Eye size={16} />
            </div>
          </div>
        ) : (
          <span className="flex size-14 shrink-0 flex-col items-center justify-center rounded-lg bg-teal-50 text-[#147d73] border border-teal-100">
            <FileText size={20} />
            <span className="text-[10px] font-bold mt-0.5">{isPdf ? "PDF" : "DOC"}</span>
          </span>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-slate-800 dark:text-zinc-200" title={file.name}>
            {file.name}
          </p>
          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
            {(file.size / 1024).toFixed(0)} KB • {isImg ? "Image preview ready" : "PDF Document"}
          </p>
          <span className="inline-flex items-center text-[10px] font-medium text-[#147d73] mt-1 group-hover:underline">
            <Eye size={11} className="mr-1" /> Click to view full
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 pt-0.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onPreview}
          className="h-8 flex-1 text-xs font-semibold text-[#147d73] hover:bg-teal-50 border-teal-200 gap-1 rounded-lg"
        >
          <Eye size={13} /> Preview
        </Button>
        <button
          type="button"
          onClick={onChangeClick}
          className="h-8 inline-flex items-center justify-center px-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
          title="Replace file"
        >
          <Upload size={13} className="mr-1" /> Change
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="h-8 w-8 inline-flex items-center justify-center text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors cursor-pointer"
          title="Remove file"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

// ─── File Document Preview Modal (High-Res & Zoom) ────────────────────────────
function FileDocumentPreviewModal({
  file,
  title,
  onClose,
}: {
  file: File | null;
  title: string;
  onClose: () => void;
}) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState(false);
  const [isImg, setIsImg] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (!file) {
      setBlobUrl(null);
      setZoom(1);
      setRotation(0);
      return;
    }
    const url = URL.createObjectURL(file);
    const pdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const img = file.type.startsWith("image/") || /\.(png|jpe?g|webp|gif|svg)$/i.test(file.name);
    setIsPdf(pdf);
    setIsImg(img);
    setBlobUrl(url);
    setZoom(1);
    setRotation(0);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const handleDownload = () => {
    if (!blobUrl || !file) return;
    const anchor = document.createElement("a");
    anchor.href = blobUrl;
    anchor.download = file.name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  return (
    <Dialog open={!!file} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="flex h-[90dvh] max-h-[90dvh] min-h-0 flex-col gap-3 overflow-hidden p-4 sm:max-w-5xl sm:p-6 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl">
        <DialogHeader className="shrink-0 pr-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-teal-50 text-[#147d73]">
                {isImg ? <ImageIcon size={18} /> : <FileText size={18} />}
              </span>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900 dark:text-zinc-100">
                  {title || "Document Preview"}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  {file?.name} • {((file?.size || 0) / 1024).toFixed(0)} KB • {isPdf ? "PDF Document" : isImg ? "Image Preview" : "Document"}
                </DialogDescription>
              </div>
            </div>

            {isImg && (
              <div className="hidden sm:flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                  className="h-7 w-7 p-0 text-slate-600 hover:text-slate-900"
                  title="Zoom Out"
                >
                  <ZoomOut size={14} />
                </Button>
                <span className="text-[11px] font-mono px-1 font-semibold text-slate-600 min-w-[40px] text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
                  className="h-7 w-7 p-0 text-slate-600 hover:text-slate-900"
                  title="Zoom In"
                >
                  <ZoomIn size={14} />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="h-7 w-7 p-0 text-slate-600 hover:text-slate-900"
                  title="Rotate 90°"
                >
                  <RotateCw size={14} />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => { setZoom(1); setRotation(0); }}
                  className="h-7 px-2 text-[11px] font-medium text-slate-600 hover:text-slate-900"
                  title="Reset view"
                >
                  Reset
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="relative min-h-0 flex-1 overflow-auto rounded-xl border border-slate-200 bg-slate-900/5 dark:border-zinc-800 dark:bg-zinc-950 flex items-center justify-center p-3">
          {blobUrl ? (
            isPdf ? (
              <iframe
                title={title}
                src={blobUrl}
                className="h-full w-full rounded-lg border-0 bg-white"
              />
            ) : isImg ? (
              <div className="flex items-center justify-center w-full h-full overflow-auto p-2">
                <img
                  src={blobUrl}
                  alt={title}
                  style={{
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    transition: "transform 0.2s ease-out",
                  }}
                  className="max-h-full max-w-full object-contain rounded-lg shadow-md select-none"
                />
              </div>
            ) : (
              <div className="text-center p-6 text-slate-500">
                <FileText className="mx-auto h-12 w-12 text-slate-400 mb-2" />
                <p className="text-sm font-medium">Preview not supported for this file format</p>
                <p className="text-xs text-slate-400 mt-1">Download the file to view its contents.</p>
              </div>
            )
          ) : (
            <div className="flex items-center gap-2 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading preview...</span>
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">
              {isPdf ? "PDF Document" : isImg ? "Image File" : "Attachment"}
            </span>
            {isImg && (
              <span className="text-[11px] text-[#147d73] bg-teal-50 px-2 py-0.5 rounded-md font-semibold">
                High Resolution Preview
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="text-xs font-semibold gap-1.5"
            >
              <Download size={14} /> Download
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={onClose}
              className="office-primary text-xs font-semibold px-4"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ManualAdmissionPage() {
  const router = useRouter();

  // Dynamic Form Config from /api/forms/
  const [activeForm, setActiveForm] = useState<AdmissionForm | null>(null);
  const [refreshingForms, setRefreshingForms] = useState(false);
  const [availableForms, setAvailableForms] = useState<AdmissionForm[]>([]);
  const [entryMode, setEntryMode] = useState<"manual" | "bulk">("manual");
  const submissionLock = useRef(false);
  const [submissionWarnings, setSubmissionWarnings] = useState<string[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>("");

  const [loadingInitial, setLoadingInitial] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitMode, setSubmitMode] = useState<"standard" | "add_another">("standard");
  const [errorMsg, setErrorMsg] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<number, string>>({});
  
  const [successData, setSuccessData] = useState<{
    admission_number: string;
    studentName?: string;
  } | null>(null);

  // Dynamic field values state (key = field.id)
  const [dynamicValues, setDynamicValues] = useState<Record<number, any>>({});
  
  // File uploads state for document_fields (key = docField.id)
  const [docFiles, setDocFiles] = useState<Record<number, File>>({});
  const [previewDoc, setPreviewDoc] = useState<{ file: File; title: string } | null>(null);

  // RTE details
  const [isRte, setIsRte] = useState(false);
  const [rteDocument, setRteDocument] = useState<File | null>(null);

  const firstInputRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoadingInitial(true);
      try {
        const [formsRes, classesRes, yearsRes] = await Promise.all([
          fetchWithAuth(`${API_BASE_URL}/forms/`),
          fetchWithAuth(`${API_BASE_URL}/getclass/`).then((r) => r.ok ? r : fetchWithAuth(`${API_BASE_URL}/schoolclass/`)),
          fetchWithAuth(`${API_BASE_URL}/main-academic-year/`).then((r) => r.ok ? r : fetchWithAuth(`${API_BASE_URL}/academic-year/`)),
        ]);

        if (formsRes.ok) {
          const formsData = await formsRes.json();
          const list: AdmissionForm[] = Array.isArray(formsData) ? formsData : formsData.results || [];
          const enabled = list.filter(form => form.is_active);
          setAvailableForms(enabled);
          const active = enabled[0] || null;
          setActiveForm(active);
        }

        if (classesRes.ok) {
          const cData = await classesRes.json();
          const list: SchoolClass[] = Array.isArray(cData) ? cData : cData.results || cData.data || [];
          setClasses(list);
        }

        if (yearsRes.ok) {
          const yData = await yearsRes.json();
          const list: AcademicYear[] = Array.isArray(yData) ? yData : yData.results || yData.data || [];
          setAcademicYears(list);
          const activeYear = list.find((y) => y.is_active) || list[0];
          if (activeYear) {
            setSelectedAcademicYear(String(activeYear.id));
          }
        }
      } catch (err) {
        console.error("Failed to load admission configuration:", err);
      } finally {
        setLoadingInitial(false);
      }
    }
    loadData();
  }, []);

  const refreshForms = useCallback(async () => {
    if (submitting) return;
    setRefreshingForms(true);
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/forms/`, { cache: "no-store" });
      if (!response.ok) throw new Error("Could not refresh admission forms");
      const data = await response.json();
      const enabled: AdmissionForm[] = (Array.isArray(data) ? data : data.results || []).filter((form: AdmissionForm) => form.is_active);
      setAvailableForms(enabled);
      setActiveForm(previous => enabled.find(form => form.id === previous?.id) || enabled[0] || null);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not refresh forms"); }
    finally { setRefreshingForms(false); }
  }, [submitting]);
  useEffect(() => { const refresh = () => { void refreshForms(); }; window.addEventListener("focus", refresh); return () => window.removeEventListener("focus", refresh); }, [refreshForms]);

  // Real-time Field Validator
  const validateSingleField = (field: FormField, value: any): string => {
    return validateAdmissionField(field, normalizeAdmissionValue(field, value));
  };

  const handleDynamicChange = (field: FormField, value: any) => {
    const processedValue = value;

    setDynamicValues((prev) => ({ ...prev, [field.id]: processedValue }));

    // Live Validation check
    const error = validateSingleField(field, processedValue);
    setFieldErrors((prev) => {
      const copy = { ...prev };
      if (error) {
        copy[field.id] = error;
      } else {
        delete copy[field.id];
      }
      return copy;
    });

    if (errorMsg) setErrorMsg("");
  };

  const handleFileChange = (docFieldId: number, file: File | null): boolean => {
    if (file) {
      const fileError = validateAdmissionFile(file);
      if (fileError) { toast.error(fileError); setDocFiles(previous => { const next = { ...previous }; delete next[docFieldId]; return next; }); return false; }
      const isImage = file.type.startsWith("image/") || /\.(png|jpe?g|webp|gif|svg)$/i.test(file.name);
      const maxSize = isImage ? 1 * 1024 * 1024 : 3 * 1024 * 1024;
      const maxLabel = isImage ? "1MB (Photos/Images)" : "3MB (Documents/PDFs)";

      if (file.size > maxSize) {
        toast.error(`File "${file.name}" exceeds the maximum allowed size of ${maxLabel}.`);
        setDocFiles((prev) => {
          const copy = { ...prev };
          delete copy[docFieldId];
          return copy;
        });
        return false;
      }
      setDocFiles((prev) => ({ ...prev, [docFieldId]: file }));
      return true;
    } else {
      setDocFiles((prev) => {
        const copy = { ...prev };
        delete copy[docFieldId];
        return copy;
      });
      return true;
    }
  };

  const handleRteFileChange = (file: File | null): boolean => {
    if (file) {
      const fileError = validateAdmissionFile(file);
      if (fileError) { toast.error(fileError); setRteDocument(null); return false; }
      const isImage = file.type.startsWith("image/") || /\.(png|jpe?g|webp|gif|svg)$/i.test(file.name);
      const maxSize = isImage ? 1 * 1024 * 1024 : 3 * 1024 * 1024;
      const maxLabel = isImage ? "1MB (Photos)" : "3MB (Documents/PDFs)";

      if (file.size > maxSize) {
        toast.error(`File "${file.name}" exceeds maximum allowed size of ${maxLabel}.`);
        setRteDocument(null);
        return false;
      }
      setRteDocument(file);
      return true;
    } else {
      setRteDocument(null);
      return true;
    }
  };

  const handleSubmit = async (e: React.FormEvent, mode: "standard" | "add_another" = "standard") => {
    e.preventDefault();
    if (submissionLock.current) return;
    setErrorMsg("");
    setSubmitMode(mode);

    if (!activeForm || !activeForm.is_active) {
      setErrorMsg("No active admission form found for this school.");
      return;
    }

    if (academicYears.length && !academicYears.some(year => String(year.id) === selectedAcademicYear)) { setErrorMsg("Select an available academic year."); return; }

    // Comprehensive validation pass
    const newErrors: Record<number, string> = {};
    let firstErrorFieldId: number | null = null;

    for (const sec of activeForm.sections || []) {
      for (const f of sec.fields || []) {
        const val = dynamicValues[f.id];
        const error = validateSingleField(f, val);
        if (error) {
          newErrors[f.id] = error;
          if (firstErrorFieldId === null) {
            firstErrorFieldId = f.id;
          }
        }
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(newErrors);
      setErrorMsg("Please fix the highlighted errors before submitting.");
      // Scroll to first errored field
      if (firstErrorFieldId !== null) {
        const el = document.getElementById(`field-input-${firstErrorFieldId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.focus();
        }
      }
      return;
    }

    const classField = admissionFields(activeForm).find(field => field.map_to_student_field === "school_class");
    if (classField && dynamicValues[classField.id] && !classes.some(item => String(item.id) === String(dynamicValues[classField.id]) || item.school_class === dynamicValues[classField.id])) { setFieldErrors({ [classField.id]: "Select an available school class" }); return; }

    // Validate required document fields
    for (const df of activeForm.document_fields || []) {
      if (df.is_required && !docFiles[df.id]) {
        setErrorMsg(`Please upload required document: "${toTitleCase(df.label)}"`);
        return;
      }
    }

    if (isRte && !rteDocument) {
      setErrorMsg("Please upload RTE Verification Document.");
      return;
    }

    submissionLock.current = true;
    setSubmitting(true);

    try {
      const result = await submitAdmission({ form: activeForm, values: dynamicValues, academicYear: selectedAcademicYear, documents: docFiles, isRte, rteDocument });
      const admissionNumber = result.admissionNumber;
      setSubmissionWarnings(result.warnings);
      result.warnings.forEach(warning => toast.warning(warning));

      // Identify student name for display
      const nameFields = admissionFields(activeForm).filter(field => ["name", "surname"].includes(field.map_to_student_field || "") || /^(student (full )?|full )?name$/i.test(field.label));
      const studentName = nameFields.map(field => String(dynamicValues[field.id] || "").trim()).filter(Boolean).join(" ");

      const finalName = studentName.trim() || "New Student Application";

      if (mode === "add_another") {
        toast.success(`Application #${admissionNumber} submitted for ${finalName}! Form cleared for next student.`);
        // Reset inputs, keep academic year
        setDynamicValues({});
        setDocFiles({});
        setFieldErrors({});
        setIsRte(false);
        setRteDocument(null);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setSuccessData({
          admission_number: String(admissionNumber),
          studentName: finalName,
        });
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Something went wrong during submission.");
      toast.error(err.message || "Submission failed.");
    } finally {
      submissionLock.current = false;
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSuccessData(null);
    setSubmissionWarnings([]);
    setErrorMsg("");
    setFieldErrors({});
    setDynamicValues({});
    setDocFiles({});
    setIsRte(false);
    setRteDocument(null);
  };

  // Find student birth date field value if present to show live age preview
  const dobField = useMemo(() => {
    if (!activeForm?.sections) return null;
    for (const sec of activeForm.sections) {
      for (const f of sec.fields || []) {
        if (isDobField(f)) return f;
      }
    }
    return null;
  }, [activeForm]);

  const dobValue = dobField ? dynamicValues[dobField.id] : "";
  const calculatedAge = useMemo(() => calculateAge(dobValue), [dobValue]);

  if (successData) {
    return (
      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
        <Card className="border-emerald-200 bg-white dark:bg-zinc-900 shadow-xl rounded-2xl overflow-hidden border">
          <CardHeader className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-6 sm:p-8">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner shrink-0">
                <CheckCircle2 size={32} className="text-white" />
              </div>
              <div>
                <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight">Admission Application Recorded!</CardTitle>
                <CardDescription className="text-emerald-100 text-xs sm:text-sm mt-1">
                  Student application has been successfully saved. You can now assign GR Number, Class & Division in Student Directory.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 sm:p-8 space-y-6">
            {submissionWarnings.length > 0 && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Application saved. Some uploads need attention: {submissionWarnings.join("; ")}</div>}
            <div className="bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl p-5 border border-emerald-100 dark:border-emerald-900/50 shadow-xs space-y-3.5">
              <div className="flex justify-between items-center pb-3 border-b border-emerald-100 dark:border-emerald-900/40">
                <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Applicant Name</span>
                <span className="text-base font-bold text-gray-900 dark:text-zinc-100">{successData.studentName}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-emerald-100 dark:border-emerald-900/40">
                <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Admission Form / Ref No.</span>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/50 dark:text-blue-300 font-mono text-sm px-3 py-1 font-bold">
                  {successData.admission_number}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Status & Next Step</span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
                  <Sparkles size={13} /> Pending GR No. & Class Assignment
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <Button onClick={resetForm} variant="outline" className="h-12 text-sm font-semibold rounded-xl border-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-800">
                <UserPlus className="mr-2 h-4 w-4 text-blue-600" /> Fill Another Application
              </Button>
              <Button onClick={() => router.push("/clerk/students")} className="h-12 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md">
                <GraduationCap className="mr-2 h-4 w-4" /> Go to Student Directory
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="clerk-page admission-page mx-auto w-full min-w-0 space-y-6">
      <div className="office-actions flex-wrap">
        <div className="mr-auto flex gap-1 rounded-xl border border-slate-200 bg-white p-1">
          <button type="button" disabled={submitting} onClick={() => setEntryMode("manual")} className={`rounded-lg px-4 py-2 text-sm font-semibold ${entryMode === "manual" ? "bg-teal-50 text-teal-700" : "text-slate-500"}`}>Single admission</button>
          <button type="button" disabled={submitting} onClick={() => setEntryMode("bulk")} className={`rounded-lg px-4 py-2 text-sm font-semibold ${entryMode === "bulk" ? "bg-teal-50 text-teal-700" : "text-slate-500"}`}>Excel bulk import</button>
        </div>
        <label className="text-xs font-semibold text-slate-500">Admission form
          <select aria-label="Admission form" disabled={submitting || entryMode === "bulk"} value={activeForm?.id ?? ""} onChange={event => { const form = availableForms.find(item => item.id === Number(event.target.value)); if (form) { setActiveForm(form); resetForm(); } }} className="ml-2 max-w-64 rounded-lg border border-slate-200 bg-white p-2 text-sm text-slate-700">{availableForms.map(form => <option key={form.id} value={form.id}>{form.title || form.form_title || `Form ${form.id}`}</option>)}</select>
        </label>
        <button type="button" onClick={refreshForms} disabled={submitting || refreshingForms} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold disabled:opacity-50">{refreshingForms ? "Refreshing..." : "Refresh form fields"}</button>
        {/* Academic Year Selection & Actions */}
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-xs">
            <Calendar className="h-4 w-4 text-blue-600 shrink-0" />
            <span className="text-xs font-semibold text-gray-500">Academic Year:</span>
            <select
              value={selectedAcademicYear}
              disabled={submitting}
              onChange={(e) => setSelectedAcademicYear(e.target.value)}
              className="bg-transparent text-xs font-bold text-gray-800 dark:text-zinc-200 focus:outline-none cursor-pointer"
            >
              {academicYears.length > 0 ? (
                academicYears.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name} {y.is_active ? "(Active)" : ""}
                  </option>
                ))
              ) : (
                <option value="">No academic years configured</option>
              )}
            </select>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={resetForm}
            disabled={submitting}
            className="text-xs font-medium text-gray-600 hover:text-red-600 gap-1 rounded-xl"
            title="Clear all fields"
          >
            <RotateCcw size={13} /> Reset
          </Button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 flex items-center gap-3 text-red-700 dark:text-red-300 text-sm shadow-xs animate-in fade-in">
          <AlertCircle size={20} className="shrink-0 text-red-500" />
          <span className="font-medium">{errorMsg}</span>
        </div>
      )}

      {loadingInitial ? (
        <div className="flex flex-col justify-center items-center py-24 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 shadow-xs">
          <Loader2 className="h-9 w-9 animate-spin text-blue-600 mb-3" />
          <span className="text-sm text-gray-500 font-medium">Loading admission form fields...</span>
        </div>
      ) : entryMode === "bulk" && activeForm ? (
        <BulkAdmissionImport key={activeForm.id} form={activeForm} academicYear={selectedAcademicYear} classes={classes} onBusyChange={setSubmitting} />
      ) : activeForm && activeForm.sections && activeForm.sections.length > 0 ? (
        <form noValidate onSubmit={(e) => handleSubmit(e, "standard")} className="space-y-6">
          <fieldset disabled={submitting} className="space-y-6">

          {dobValue && calculatedAge.valid && <p className="rounded-xl border border-teal-100 bg-teal-50/50 px-4 py-3 text-xs font-semibold text-teal-800">Student age: {calculatedAge.text}</p>}
          {/* DYNAMIC SECTIONS */}
          {activeForm.sections.map((section, sIdx) => (
            <Card key={section.id} className="rounded-2xl border-gray-200 dark:border-zinc-800 shadow-xs overflow-hidden bg-white dark:bg-zinc-900">
              <CardHeader className="bg-slate-50/80 dark:bg-zinc-800/40 border-b border-gray-100 dark:border-zinc-800 py-3.5 px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1 rounded-md bg-white dark:bg-zinc-800 shadow-xs border border-gray-100 dark:border-zinc-700">
                      {getSectionIcon(section.title)}
                    </div>
                    <CardTitle className="text-sm font-bold text-gray-900 dark:text-zinc-100">
                      {toTitleCase(section.title)}
                    </CardTitle>
                  </div>
                  <Badge variant="secondary" className="text-[11px] font-semibold text-gray-500 bg-gray-100 dark:bg-zinc-800">
                    {section.fields?.length || 0} {section.fields?.length === 1 ? "field" : "fields"}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
                {section.fields?.map(field => <AdmissionFieldInput key={field.id} field={field} value={dynamicValues[field.id]} onChange={value => handleDynamicChange(field, value)} error={fieldErrors[field.id]} disabled={submitting} classes={classes} />)}
              </CardContent>
            </Card>
          ))}
          {/* DOCUMENT ATTACHMENTS */}
          {activeForm.document_fields && activeForm.document_fields.length > 0 && (
            <Card className="rounded-2xl border-slate-200 dark:border-zinc-800 shadow-xs overflow-hidden bg-white dark:bg-zinc-900">
              <CardHeader className="bg-slate-50/80 dark:bg-zinc-800/40 border-b border-slate-100 dark:border-zinc-800 py-3.5 px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-teal-50 text-teal-700">
                      <UploadCloud className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                        Required Document Uploads
                      </CardTitle>
                      <p className="text-[11px] text-slate-500">PDF, JPG, PNG or WebP up to 3 MB each. Click preview to inspect.</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[11px] font-semibold text-teal-700 bg-teal-50 dark:bg-teal-950/40 border-teal-200">
                    {activeForm.document_fields.length} {activeForm.document_fields.length === 1 ? "document" : "documents"}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {activeForm.document_fields.map((docField) => {
                  const selectedFile = docFiles[docField.id];
                  const isPdf = selectedFile?.name.toLowerCase().endsWith(".pdf") || selectedFile?.type === "application/pdf";
                  return (
                    <div
                      key={docField.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        selectedFile
                          ? "border-teal-200 bg-teal-50/20 dark:bg-teal-950/10 dark:border-teal-900/50 shadow-xs"
                          : "border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50"
                      } flex flex-col justify-between space-y-3`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 truncate">
                          {toTitleCase(docField.label)} {docField.is_required && <span className="text-red-500 font-bold">*</span>}
                        </span>
                        {selectedFile ? (
                          <span className="inline-flex items-center text-[10px] font-semibold text-teal-700 bg-teal-100/70 px-2 py-0.5 rounded-md shrink-0">
                            <Check size={11} className="mr-1" /> Selected
                          </span>
                        ) : docField.is_required ? (
                          <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 shrink-0">
                            Required
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 shrink-0">Optional</span>
                        )}
                      </div>

                      {selectedFile ? (
                        <DocumentFileThumbnail
                          file={selectedFile}
                          title={toTitleCase(docField.label)}
                          onPreview={() => setPreviewDoc({ file: selectedFile, title: toTitleCase(docField.label) })}
                          onChangeClick={() => {
                            const inputElem = document.getElementById(`doc-input-${docField.id}`) as HTMLInputElement | null;
                            inputElem?.click();
                          }}
                          onRemove={() => handleFileChange(docField.id, null)}
                        />
                      ) : (
                        <label
                          htmlFor={`doc-input-${docField.id}`}
                          className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-dashed border-slate-300 hover:border-teal-400 hover:bg-teal-50/30 transition-all cursor-pointer text-center bg-white dark:bg-zinc-800"
                        >
                          <UploadCloud className="h-6 w-6 text-slate-400" />
                          <span className="text-xs font-semibold text-[#147d73]">Choose file to upload</span>
                          <span className="text-[10px] text-slate-400">PDF, JPG, PNG up to 3MB</span>
                        </label>
                      )}

                      <input
                        type="file"
                        id={`doc-input-${docField.id}`}
                        accept=".pdf,.png,.jpg,.jpeg,.webp"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          const ok = handleFileChange(docField.id, file);
                          if (!ok && e.target) {
                            e.target.value = "";
                          }
                        }}
                      />
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* RTE (RIGHT TO EDUCATION) SECTION */}
          <Card className="rounded-2xl border-teal-200 dark:border-teal-900/50 shadow-xs overflow-hidden bg-teal-50/20 dark:bg-teal-950/20">
            <CardHeader className="border-b border-teal-100 dark:border-teal-900/50 py-3.5 px-6">
              <div className="flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-[#147d73]" />
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                  RTE (Right to Education) Applicable?
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_rte"
                  checked={isRte}
                  onChange={(e) => setIsRte(e.target.checked)}
                  className="h-4 w-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500 cursor-pointer"
                />
                <label htmlFor="is_rte" className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-zinc-200 cursor-pointer">
                  Yes, this student is applying under the RTE Act (0 School Tuition Fee)
                </label>
              </div>

              {isRte && (
                <div className="p-4 rounded-xl border border-teal-200 bg-white dark:bg-zinc-900 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                      Upload RTE Verification Document <span className="text-red-500">*</span>
                    </span>
                    {rteDocument ? (
                      <span className="inline-flex items-center text-[10px] font-semibold text-[#147d73] bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                        <FileCheck size={12} className="mr-1" /> Selected
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        Required for RTE
                      </span>
                    )}
                  </div>

                  {rteDocument ? (
                    <DocumentFileThumbnail
                      file={rteDocument}
                      title="RTE Verification Document"
                      onPreview={() => setPreviewDoc({ file: rteDocument, title: "RTE Verification Document" })}
                      onChangeClick={() => {
                        const inputElem = document.getElementById("rte-doc-input") as HTMLInputElement | null;
                        inputElem?.click();
                      }}
                      onRemove={() => handleRteFileChange(null)}
                    />
                  ) : (
                    <label
                      htmlFor="rte-doc-input"
                      className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-dashed border-slate-300 hover:border-teal-400 hover:bg-teal-50/30 transition-all cursor-pointer text-center"
                    >
                      <UploadCloud className="h-6 w-6 text-teal-600" />
                      <span className="text-xs font-semibold text-teal-700">Choose RTE Allotment Certificate</span>
                      <span className="text-[10px] text-slate-400">PDF, JPG, PNG up to 3MB</span>
                    </label>
                  )}

                  <input
                    type="file"
                    id="rte-doc-input"
                    accept=".pdf,.png,.jpg,.jpeg,.webp"
                    required={isRte}
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      const ok = handleRteFileChange(file);
                      if (!ok && e.target) {
                        e.target.value = "";
                      }
                    }}
                  />
                  <p className="text-[10px] text-slate-400">
                    Provide the official RTE allotment order / approval certificate. (PDF/PNG/JPG Max 3MB)
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ACTION TOOLBAR */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/clerk/students")}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-medium"
            >
              Cancel
            </Button>

            <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
              <Button
                type="button"
                disabled={submitting}
                onClick={(e) => handleSubmit(e, "add_another")}
                variant="outline"
                className="w-full sm:w-auto px-5 py-2.5 border-teal-200 text-teal-700 hover:bg-teal-50 dark:border-teal-900 dark:text-teal-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                {submitting && submitMode === "add_another" ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Submitting...
                  </>
                ) : (
                  <>
                    <PlusCircle className="h-3.5 w-3.5 text-teal-700" /> Submit & Add Another
                  </>
                )}
              </Button>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto px-7 py-2.5 office-primary text-white rounded-xl text-xs font-semibold shadow-md flex items-center justify-center gap-2"
              >
                {submitting && submitMode === "standard" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Submitting...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" /> Submit Application
                  </>
                )}
              </Button>
            </div>
          </div>
          </fieldset>
        </form>
      ) : (
        <div className="p-10 text-center bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800">
          <AlertCircle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100">No Active Admission Form Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Please configure and activate an admission form under Admission Form Builder before taking manual admissions.
          </p>
          <div className="mt-4">
            <Link href="/clerk/admission-form">
              <Button size="sm" className="office-primary text-white rounded-xl text-xs font-semibold">
                Go to Admission Form Builder
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Live Document Preview Dialog */}
      {previewDoc && (
        <FileDocumentPreviewModal
          file={previewDoc.file}
          title={previewDoc.title}
          onClose={() => setPreviewDoc(null)}
        />
      )}
    </div>
  );
}
