"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
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
} from "lucide-react";

import { fetchWithAuth } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";
import { aadhaarSchema, isAadhaarField, AADHAAR_ERROR } from "@/lib/student-profile-validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface FormField {
  id: number;
  label: string;
  field_type: "text" | "number" | "date" | "select" | "checkbox" | "radio";
  is_required: boolean;
  options?: any;
  map_to_student_field?: string | null;
}

interface FormSection {
  id: number;
  title: string;
  order: number;
  fields: FormField[];
}

interface DocumentField {
  id: number;
  label: string;
  is_required: boolean;
}

interface AdmissionForm {
  id: number;
  form_title?: string;
  is_active: boolean;
  sections: FormSection[];
  document_fields: DocumentField[];
}

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

// Field Type Detectors
function isMobileField(field: FormField): boolean {
  const map = field.map_to_student_field?.toLowerCase() || "";
  const lbl = field.label.toLowerCase();
  return map === "mobile" || map === "phone" || /mobile|phone|contact|whatsapp/i.test(lbl);
}

function isEmailField(field: FormField): boolean {
  const map = field.map_to_student_field?.toLowerCase() || "";
  const lbl = field.label.toLowerCase();
  return map === "email" || /email|mail/i.test(lbl);
}

function isDobField(field: FormField): boolean {
  const map = field.map_to_student_field?.toLowerCase() || "";
  const lbl = field.label.toLowerCase();
  return field.field_type === "date" || map === "date_of_birth" || /birth|dob/i.test(lbl);
}

function isPincodeField(field: FormField): boolean {
  const lbl = field.label.toLowerCase();
  return /pin\s*code|pincode|postal/i.test(lbl);
}

function getSectionIcon(title: string) {
  const t = title.toLowerCase();
  if (t.includes("academic") || t.includes("class") || t.includes("course") || t.includes("stream")) {
    return <GraduationCap className="h-4 w-4 text-blue-600" />;
  }
  if (t.includes("parent") || t.includes("guardian") || t.includes("family") || t.includes("father") || t.includes("mother")) {
    return <Users className="h-4 w-4 text-purple-600" />;
  }
  if (t.includes("address") || t.includes("location") || t.includes("contact") || t.includes("residence")) {
    return <MapPin className="h-4 w-4 text-emerald-600" />;
  }
  if (t.includes("previous") || t.includes("school") || t.includes("transfer") || t.includes("history")) {
    return <Building2 className="h-4 w-4 text-amber-600" />;
  }
  if (t.includes("personal") || t.includes("student") || t.includes("identity") || t.includes("basic")) {
    return <User className="h-4 w-4 text-blue-600" />;
  }
  return <ClipboardList className="h-4 w-4 text-indigo-600" />;
}

export default function ManualAdmissionPage() {
  const router = useRouter();

  // Dynamic Form Config from /api/forms/
  const [activeForm, setActiveForm] = useState<AdmissionForm | null>(null);
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
          const active = list.find((f) => f.is_active) || list[0] || null;
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

  // Real-time Field Validator
  const validateSingleField = (field: FormField, value: any): string => {
    const strVal = String(value ?? "").trim();

    if (field.is_required && !strVal) {
      return `${toTitleCase(field.label)} is required`;
    }

    if (!strVal) return "";

    // Aadhaar Validation
    if (isAadhaarField(field)) {
      const clean = strVal.replace(/\s+/g, "");
      if (!/^\d{12}$/.test(clean)) {
        return "Must be exactly 12 numeric digits";
      }
    }

    // Mobile Validation
    if (isMobileField(field)) {
      const clean = strVal.replace(/\D/g, "");
      if (clean.length > 0 && !/^[6-9]\d{9}$/.test(clean)) {
        return "Enter valid 10-digit Indian mobile number (6-9)";
      }
    }

    // Email Validation
    if (isEmailField(field)) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(strVal)) {
        return "Enter a valid email address (e.g. name@domain.com)";
      }
    }

    // Pincode Validation
    if (isPincodeField(field)) {
      const clean = strVal.replace(/\D/g, "");
      if (clean.length > 0 && !/^\d{6}$/.test(clean)) {
        return "PIN Code must be exactly 6 digits";
      }
    }

    // Date of Birth Validation
    if (isDobField(field)) {
      const ageRes = calculateAge(strVal);
      if (!ageRes.valid && ageRes.error) {
        return ageRes.error;
      }
      if (ageRes.years > 30) {
        return "Please verify birth date (age exceeds 30 years)";
      }
    }

    return "";
  };

  const handleDynamicChange = (field: FormField, value: any) => {
    let processedValue = value;

    // Aadhaar: only digits, max 12
    if (isAadhaarField(field) && typeof value === "string") {
      processedValue = value.replace(/\D/g, "").slice(0, 12);
    }
    // Mobile: only digits, max 10
    else if (isMobileField(field) && typeof value === "string") {
      processedValue = value.replace(/\D/g, "").slice(0, 10);
    }
    // Pincode: only digits, max 6
    else if (isPincodeField(field) && typeof value === "string") {
      processedValue = value.replace(/\D/g, "").slice(0, 6);
    }

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
    setErrorMsg("");
    setSubmitMode(mode);

    if (!activeForm) {
      setErrorMsg("No active admission form found for this school.");
      return;
    }

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
      if (firstErrorFieldId) {
        const el = document.getElementById(`field-input-${firstErrorFieldId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.focus();
        }
      }
      return;
    }

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

    setSubmitting(true);

    try {
      // 1. Submit Form Fields
      const field_values = Object.entries(dynamicValues).map(([fieldId, value]) => ({
        field: parseInt(fieldId),
        value: String(value).trim(),
      }));

      const payload: any = {
        form: activeForm.id,
        field_values,
        is_rte: isRte,
      };

      if (selectedAcademicYear) {
        payload.academic_year = parseInt(selectedAcademicYear);
      }

      const docEntries = Object.entries(docFiles);
      let subRes: Response;

      if (docEntries.length > 0) {
        const formData = new FormData();
        formData.append("form", String(activeForm.id));
        formData.append("field_values", JSON.stringify(field_values));
        if (selectedAcademicYear) {
          formData.append("academic_year", String(selectedAcademicYear));
        }
        for (const [docFieldId, file] of docEntries) {
          formData.append("document_field", docFieldId);
          formData.append("file", file);
          formData.append(`document_${docFieldId}`, file);
        }

        subRes = await fetchWithAuth(`${API_BASE_URL}/submissions/`, {
          method: "POST",
          body: formData,
        });
      } else {
        subRes = await fetchWithAuth(`${API_BASE_URL}/submissions/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const subData = await subRes.json();

      if (!subRes.ok) {
        let msg = "Failed to submit admission form.";
        if (subData && typeof subData === "object") {
          msg = subData.detail || subData.message || subData.error || JSON.stringify(subData);
        }
        throw new Error(msg);
      }

      const admissionNumber = subData.admission_number || subData.id;
      const admissionId = subData.id;

      // 2. Submit Documents via /documentsubmission/ if needed
      if (admissionNumber && docEntries.length > 0 && (!subData.documents || subData.documents.length === 0)) {
        for (const [docFieldId, file] of docEntries) {
          const formData = new FormData();
          formData.append("admission_number", String(admissionNumber));
          formData.append("document_field", docFieldId);
          formData.append("file", file);

          await fetchWithAuth(`${API_BASE_URL}/documentsubmission/`, {
            method: "POST",
            body: formData,
          });
        }
      }

      // Submit RTE Document if attached
      if (isRte && rteDocument && admissionId) {
        const rteFormData = new FormData();
        rteFormData.append("admission", String(admissionId));
        rteFormData.append("document_name", "RTE Verification Document");
        rteFormData.append("document_file", rteDocument);

        await fetchWithAuth(`${API_BASE_URL}/rtedocument/`, {
          method: "POST",
          body: rteFormData,
        });
      }

      // Identify student name for display
      let studentName = "";
      if (activeForm.sections) {
        for (const sec of activeForm.sections) {
          for (const f of sec.fields || []) {
            const labelLower = f.label.toLowerCase();
            if (labelLower.includes("name") || labelLower.includes("student")) {
              if (dynamicValues[f.id]) {
                studentName += (studentName ? " " : "") + dynamicValues[f.id];
              }
            }
          }
        }
      }

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
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSuccessData(null);
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
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <Link href="/clerk/students" className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
              <ArrowLeft size={18} />
            </Link>
            <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center">
              <UserPlus className="h-5 w-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-zinc-100 tracking-tight">
              Manual Student Admission Form
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 pl-11">
            {activeForm?.form_title ? (
              <span>Active Form: <strong className="text-gray-800 dark:text-zinc-200 font-semibold">{activeForm.form_title}</strong></span>
            ) : (
              "Direct student registration and manual admission intake."
            )}
          </p>
        </div>

        {/* Academic Year Selection & Actions */}
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-xs">
            <Calendar className="h-4 w-4 text-blue-600 shrink-0" />
            <span className="text-xs font-semibold text-gray-500">Academic Year:</span>
            <select
              value={selectedAcademicYear}
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
                <option value="">2026-2027</option>
              )}
            </select>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={resetForm}
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
      ) : activeForm && activeForm.sections && activeForm.sections.length > 0 ? (
        <form onSubmit={(e) => handleSubmit(e, "standard")} className="space-y-6">

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
                {section.fields?.map((field, fIdx) => {
                  const val = dynamicValues[field.id] ?? "";
                  const fieldError = fieldErrors[field.id];
                  const isAadhaar = isAadhaarField(field);
                  const isMobile = isMobileField(field);
                  const isEmail = isEmailField(field);
                  const isDob = isDobField(field);
                  const isPincode = isPincodeField(field);
                  const isClass =
                    field.map_to_student_field === "school_class" ||
                    field.label.toLowerCase().includes("class") ||
                    field.label.toLowerCase().includes("standard");

                  return (
                    <div key={field.id} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label
                          htmlFor={`field-input-${field.id}`}
                          className="text-xs font-semibold text-gray-700 dark:text-zinc-300 block tracking-tight"
                        >
                          {toTitleCase(field.label)} {field.is_required && <span className="text-red-500 font-bold">*</span>}
                        </label>

                        {/* Live Aadhaar character counter & valid indicator */}
                        {isAadhaar && val && (
                          <span className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded ${
                            String(val).length === 12
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300"
                              : "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
                          }`}>
                            {String(val).length}/12 digits
                          </span>
                        )}

                        {/* Live Mobile digit counter */}
                        {isMobile && val && (
                          <span className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded ${
                            String(val).length === 10
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300"
                              : "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
                          }`}>
                            {String(val).length}/10 digits
                          </span>
                        )}
                      </div>

                      {field.field_type === "select" ? (
                        <div className="relative">
                          <select
                            id={`field-input-${field.id}`}
                            value={val}
                            onChange={(e) => handleDynamicChange(field, e.target.value)}
                            required={field.is_required}
                            className={`w-full px-3 py-2 bg-white dark:bg-zinc-900 border ${
                              fieldError ? "border-red-400 ring-1 ring-red-400" : "border-gray-200 dark:border-zinc-700"
                            } rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
                          >
                            <option value="">Select {toTitleCase(field.label)}...</option>
                            {isClass && (!field.options || field.options.length === 0) ? (
                              classes.map((c) => (
                                <option key={c.id} value={c.school_class || c.name || String(c.id)}>
                                  {c.school_class || c.name}
                                </option>
                              ))
                            ) : (
                              (field.options || []).map((opt: any, i: number) => {
                                const optVal = typeof opt === "object" && opt !== null ? (opt.value ?? opt.label ?? String(i)) : String(opt);
                                const optLbl = typeof opt === "object" && opt !== null ? (opt.label ?? opt.value ?? String(i)) : String(opt);
                                return (
                                  <option key={i} value={optVal}>
                                    {toTitleCase(optLbl)}
                                  </option>
                                );
                              })
                            )}
                          </select>
                        </div>
                      ) : isDob ? (
                        <div className="space-y-1">
                          <div className="relative">
                            <Input
                              id={`field-input-${field.id}`}
                              type="date"
                              value={val}
                              max={new Date().toISOString().split("T")[0]}
                              onChange={(e) => handleDynamicChange(field, e.target.value)}
                              required={field.is_required}
                              className={`rounded-xl text-xs sm:text-sm ${
                                fieldError ? "border-red-400 ring-1 ring-red-400" : "border-gray-200 dark:border-zinc-700"
                              }`}
                            />
                          </div>

                          {/* Dynamic Age Display Pill */}
                          {val && calculatedAge.valid && calculatedAge.text && (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50/80 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[11px] font-semibold border border-blue-100 dark:border-blue-900/50">
                              <Cake size={13} className="text-blue-600 shrink-0" />
                              <span>Age: <strong>{calculatedAge.text}</strong></span>
                            </div>
                          )}
                        </div>
                      ) : isAadhaar ? (
                        <div className="relative">
                          <Input
                            id={`field-input-${field.id}`}
                            type="text"
                            maxLength={12}
                            inputMode="numeric"
                            value={val}
                            onChange={(e) => handleDynamicChange(field, e.target.value)}
                            required={field.is_required}
                            placeholder="12-digit Aadhaar No."
                            className={`rounded-xl text-xs sm:text-sm font-mono tracking-wider ${
                              fieldError ? "border-red-400 ring-1 ring-red-400" : "border-gray-200 dark:border-zinc-700"
                            }`}
                          />
                          {String(val).length === 12 && (
                            <div className="absolute right-3 top-2.5 text-emerald-600">
                              <ShieldCheck size={16} />
                            </div>
                          )}
                        </div>
                      ) : isMobile ? (
                        <div className="relative flex rounded-xl shadow-xs">
                          <span className="inline-flex items-center px-2.5 rounded-l-xl border border-r-0 border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-500 text-xs font-semibold select-none">
                            +91
                          </span>
                          <Input
                            id={`field-input-${field.id}`}
                            type="tel"
                            maxLength={10}
                            inputMode="numeric"
                            value={val}
                            onChange={(e) => handleDynamicChange(field, e.target.value)}
                            required={field.is_required}
                            placeholder="10-digit Mobile"
                            className={`rounded-l-none rounded-r-xl text-xs sm:text-sm font-mono ${
                              fieldError ? "border-red-400 ring-1 ring-red-400" : "border-gray-200 dark:border-zinc-700"
                            }`}
                          />
                        </div>
                      ) : isEmail ? (
                        <div className="relative">
                          <Input
                            id={`field-input-${field.id}`}
                            type="email"
                            value={val}
                            onChange={(e) => handleDynamicChange(field, e.target.value)}
                            required={field.is_required}
                            placeholder="e.g. parent@example.com"
                            className={`rounded-xl text-xs sm:text-sm ${
                              fieldError ? "border-red-400 ring-1 ring-red-400" : "border-gray-200 dark:border-zinc-700"
                            }`}
                          />
                        </div>
                      ) : isPincode ? (
                        <Input
                          id={`field-input-${field.id}`}
                          type="text"
                          maxLength={6}
                          inputMode="numeric"
                          value={val}
                          onChange={(e) => handleDynamicChange(field, e.target.value)}
                          required={field.is_required}
                          placeholder="6-digit PIN code"
                          className={`rounded-xl text-xs sm:text-sm font-mono ${
                            fieldError ? "border-red-400 ring-1 ring-red-400" : "border-gray-200 dark:border-zinc-700"
                          }`}
                        />
                      ) : field.field_type === "number" ? (
                        <Input
                          id={`field-input-${field.id}`}
                          type="number"
                          value={val}
                          onChange={(e) => handleDynamicChange(field, e.target.value)}
                          required={field.is_required}
                          placeholder={`Enter ${toTitleCase(field.label)}...`}
                          className={`rounded-xl text-xs sm:text-sm ${
                            fieldError ? "border-red-400 ring-1 ring-red-400" : "border-gray-200 dark:border-zinc-700"
                          }`}
                        />
                      ) : (
                        <Input
                          id={`field-input-${field.id}`}
                          type="text"
                          value={val}
                          onChange={(e) => handleDynamicChange(field, e.target.value)}
                          required={field.is_required}
                          placeholder={`Enter ${toTitleCase(field.label)}...`}
                          className={`rounded-xl text-xs sm:text-sm ${
                            fieldError ? "border-red-400 ring-1 ring-red-400" : "border-gray-200 dark:border-zinc-700"
                          }`}
                        />
                      )}

                      {/* Field-level error message */}
                      {fieldError && (
                        <p className="text-[11px] font-semibold text-red-500 flex items-center gap-1 mt-1">
                          <AlertCircle size={12} className="shrink-0" /> {fieldError}
                        </p>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))}

          {/* DOCUMENT ATTACHMENTS */}
          {activeForm.document_fields && activeForm.document_fields.length > 0 && (
            <Card className="rounded-2xl border-gray-200 dark:border-zinc-800 shadow-xs overflow-hidden bg-white dark:bg-zinc-900">
              <CardHeader className="bg-slate-50/80 dark:bg-zinc-800/40 border-b border-gray-100 dark:border-zinc-800 py-3.5 px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1 rounded-md bg-white dark:bg-zinc-800 shadow-xs border border-gray-100 dark:border-zinc-700">
                      <UploadCloud className="h-4 w-4 text-blue-600" />
                    </div>
                    <CardTitle className="text-sm font-bold text-gray-900 dark:text-zinc-100">
                      Required Document Uploads
                    </CardTitle>
                  </div>
                  <Badge variant="outline" className="text-[11px] font-semibold text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200">
                    {activeForm.document_fields.length} {activeForm.document_fields.length === 1 ? "document" : "documents"}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {activeForm.document_fields.map((docField) => {
                  const selectedFile = docFiles[docField.id];
                  return (
                    <div
                      key={docField.id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        selectedFile
                          ? "border-emerald-200 bg-emerald-50/30 dark:bg-emerald-950/10 dark:border-emerald-900/50"
                          : "border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/50"
                      } space-y-2`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-800 dark:text-zinc-200 truncate">
                          {toTitleCase(docField.label)} {docField.is_required && <span className="text-red-500 font-bold">*</span>}
                        </span>
                        {selectedFile ? (
                          <span className="inline-flex items-center text-[10px] font-semibold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                            <Check size={11} className="mr-1" /> Selected
                          </span>
                        ) : docField.is_required ? (
                          <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            Required
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-400">Optional</span>
                        )}
                      </div>

                      <div className="relative">
                        <input
                          type="file"
                          id={`doc-input-${docField.id}`}
                          accept="image/*,application/pdf"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            const ok = handleFileChange(docField.id, file);
                            if (!ok && e.target) {
                              e.target.value = "";
                            }
                          }}
                          className="block w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-colors cursor-pointer"
                        />
                      </div>

                      {selectedFile && (
                        <div className="flex items-center justify-between text-[11px] text-gray-600 dark:text-zinc-400 pt-1 border-t border-emerald-100 dark:border-emerald-900/40">
                          <span className="truncate max-w-[170px]" title={selectedFile.name}>
                            📎 {selectedFile.name}
                          </span>
                          <span className="text-[10px] font-mono text-gray-400">
                            {(selectedFile.size / 1024).toFixed(0)} KB
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* RTE (RIGHT TO EDUCATION) SECTION */}
          <Card className="rounded-2xl border-emerald-200 dark:border-emerald-900/50 shadow-xs overflow-hidden bg-emerald-50/30 dark:bg-emerald-950/20">
            <CardHeader className="border-b border-emerald-100 dark:border-emerald-900/50 py-3.5 px-6">
              <div className="flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-emerald-600" />
                <CardTitle className="text-sm font-bold text-gray-900 dark:text-zinc-100">
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
                  className="h-4 w-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 cursor-pointer"
                />
                <label htmlFor="is_rte" className="text-xs sm:text-sm font-semibold text-gray-800 dark:text-zinc-200 cursor-pointer">
                  Yes, this student is applying under the RTE Act (0 School Tuition Fee)
                </label>
              </div>

              {isRte && (
                <div className="p-4 rounded-xl border border-emerald-200 bg-white dark:bg-zinc-900 space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-800 dark:text-zinc-200">
                      Upload RTE Verification Document <span className="text-red-500">*</span>
                    </span>
                    {rteDocument && (
                      <span className="inline-flex items-center text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        <FileCheck size={12} className="mr-1" /> Selected
                      </span>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    required={isRte}
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      const ok = handleRteFileChange(file);
                      if (!ok && e.target) {
                        e.target.value = "";
                      }
                    }}
                    className="block w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 transition-colors cursor-pointer"
                  />
                  <p className="text-[10px] text-gray-500">
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
                className="w-full sm:w-auto px-5 py-2.5 border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-900 dark:text-blue-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                {submitting && submitMode === "add_another" ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Submitting...
                  </>
                ) : (
                  <>
                    <PlusCircle className="h-3.5 w-3.5 text-blue-600" /> Submit & Add Another
                  </>
                )}
              </Button>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto px-7 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-md flex items-center justify-center gap-2"
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
        </form>
      ) : (
        <div className="p-10 text-center bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800">
          <AlertCircle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-gray-900 dark:text-zinc-100">No Active Admission Form Found</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
            Please configure and activate an admission form under Admission Form Builder before taking manual admissions.
          </p>
          <div className="mt-4">
            <Link href="/clerk/admission-form">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold">
                Go to Admission Form Builder
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
