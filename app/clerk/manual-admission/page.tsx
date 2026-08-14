"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  UserPlus,
  User,
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
} from "lucide-react";

import { fetchWithAuth } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

export default function ManualAdmissionPage() {
  const router = useRouter();

  // Dynamic Form Config from /api/forms/
  const [activeForm, setActiveForm] = useState<AdmissionForm | null>(null);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>("");

  const [loadingInitial, setLoadingInitial] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successData, setSuccessData] = useState<{
    admission_number: string;
    studentName?: string;
  } | null>(null);

  // Dynamic field values state (key = field.id)
  const [dynamicValues, setDynamicValues] = useState<Record<number, any>>({});
  
  // File uploads state for document_fields (key = docField.id)
  const [docFiles, setDocFiles] = useState<Record<number, File>>({});

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

  const handleDynamicChange = (fieldId: number, value: any) => {
    setDynamicValues((prev) => ({ ...prev, [fieldId]: value }));
    if (errorMsg) setErrorMsg("");
  };

  const handleFileChange = (docFieldId: number, file: File | null) => {
    if (file) {
      setDocFiles((prev) => ({ ...prev, [docFieldId]: file }));
    } else {
      setDocFiles((prev) => {
        const copy = { ...prev };
        delete copy[docFieldId];
        return copy;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!activeForm) {
      setErrorMsg("No active admission form found for this school.");
      return;
    }

    // Validate required fields
    for (const sec of activeForm.sections || []) {
      for (const f of sec.fields || []) {
        const val = dynamicValues[f.id];
        if (f.is_required && (val === undefined || val === null || String(val).trim() === "")) {
          setErrorMsg(`Please fill in required field: "${f.label}"`);
          return;
        }
      }
    }

    // Validate required document fields
    for (const df of activeForm.document_fields || []) {
      if (df.is_required && !docFiles[df.id]) {
        setErrorMsg(`Please upload required document: "${df.label}"`);
        return;
      }
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
      };

      if (selectedAcademicYear) {
        payload.academic_year = parseInt(selectedAcademicYear);
      }

      const subRes = await fetchWithAuth(`${API_BASE_URL}/submissions/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const subData = await subRes.json();

      if (!subRes.ok) {
        let msg = "Failed to submit admission form.";
        if (subData && typeof subData === "object") {
          msg = subData.detail || subData.message || subData.error || JSON.stringify(subData);
        }
        throw new Error(msg);
      }

      const admissionNumber = subData.admission_number || subData.id;

      // 2. Submit Documents if attached
      const docEntries = Object.entries(docFiles);
      if (admissionNumber && docEntries.length > 0) {
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

      setSuccessData({
        admission_number: String(admissionNumber),
        studentName: studentName || "New Student Application",
      });
    } catch (err: any) {
      setErrorMsg(err.message || "Something went wrong during submission.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSuccessData(null);
    setErrorMsg("");
    setDynamicValues({});
    setDocFiles({});
  };

  if (successData) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <Card className="border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-lg rounded-2xl overflow-hidden">
          <CardHeader className="bg-emerald-600 text-white p-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                <CheckCircle2 size={28} className="text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold">Admission Form Submitted!</CardTitle>
                <CardDescription className="text-emerald-100 mt-1">
                  The student application has been recorded in the system. You can now assign GR Number, Class, & Division in Student Directory.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            <div className="bg-white dark:bg-zinc-900 rounded-xl p-5 border border-emerald-100 dark:border-emerald-900/50 shadow-sm space-y-3">
              <div className="flex justify-between items-center pb-3 border-b border-gray-100 dark:border-zinc-800">
                <span className="text-sm text-gray-500 font-medium">Applicant Name / Title</span>
                <span className="text-base font-bold text-gray-900 dark:text-zinc-100">{successData.studentName}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-gray-100 dark:border-zinc-800">
                <span className="text-sm text-gray-500 font-medium">Admission Form No.</span>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 font-mono text-xs px-3 py-1 font-bold">
                  {successData.admission_number}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 font-medium">Next Action</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                  <Sparkles size={12} /> Pending GR No. & Class Assignment
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <Button onClick={resetForm} variant="outline" className="flex-1 py-5 text-sm font-semibold rounded-xl">
                <UserPlus className="mr-2 h-4 w-4" /> Fill Another Admission Form
              </Button>
              <Button onClick={() => router.push("/clerk/students")} className="flex-1 py-5 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl">
                <GraduationCap className="mr-2 h-4 w-4" /> Assign GR No., Class & Division
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/clerk/students" className="text-gray-400 hover:text-gray-600 transition-colors">
              <ArrowLeft size={18} />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-2">
              <UserPlus className="h-6 w-6 text-blue-600" /> Manual Student Admission Form
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-gray-500">
            {activeForm?.form_title ? (
              <span>Admission Form: <strong className="text-gray-800 dark:text-zinc-200">{activeForm.form_title}</strong></span>
            ) : (
              "Fill out the school's configured admission form on behalf of a student."
            )}
          </p>
        </div>

        {/* Academic Year Selection */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-xs">
            <Calendar className="h-4 w-4 text-blue-600" />
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

          <Link href="/clerk/students">
            <Button variant="outline" size="sm" className="hidden sm:flex items-center gap-1.5 text-xs font-medium">
              <GraduationCap size={14} /> Student Directory
            </Button>
          </Link>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 flex items-center gap-3 text-red-700 dark:text-red-300 text-sm">
          <AlertCircle size={20} className="shrink-0 text-red-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      {loadingInitial ? (
        <div className="flex justify-center items-center py-20 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-3 text-sm text-gray-500 font-medium">Loading admission form fields...</span>
        </div>
      ) : activeForm && activeForm.sections && activeForm.sections.length > 0 ? (
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* DYNAMIC SECTIONS LOADED FROM SCHOOL'S ADMISSION FORM CONFIGURATION */}
          {activeForm.sections.map((section) => (
            <Card key={section.id} className="rounded-2xl border-gray-200 dark:border-zinc-800 shadow-sm overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-slate-100 dark:from-zinc-900 dark:to-zinc-800 border-b border-gray-100 dark:border-zinc-800 py-3.5 px-6">
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-blue-600" />
                  <CardTitle className="text-sm font-bold text-gray-900 dark:text-zinc-100">
                    {section.title}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {section.fields?.map((field) => {
                  const val = dynamicValues[field.id] ?? "";
                  const isClassField =
                    field.map_to_student_field === "school_class" ||
                    field.label.toLowerCase().includes("class") ||
                    field.label.toLowerCase().includes("standard");

                  return (
                    <div key={field.id} className="space-y-1">
                      <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300 block">
                        {field.label} {field.is_required && <span className="text-red-500">*</span>}
                      </label>

                      {field.field_type === "select" ? (
                        <select
                          value={val}
                          onChange={(e) => handleDynamicChange(field.id, e.target.value)}
                          required={field.is_required}
                          className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select {field.label}...</option>
                          {/* If this is the Applying For Class field and options are empty, render school classes */}
                          {isClassField && (!field.options || field.options.length === 0) ? (
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
                                  {optLbl}
                                </option>
                              );
                            })
                          )}
                        </select>
                      ) : field.field_type === "date" ? (
                        <Input
                          type="date"
                          value={val}
                          onChange={(e) => handleDynamicChange(field.id, e.target.value)}
                          required={field.is_required}
                          className="rounded-xl text-sm"
                        />
                      ) : field.field_type === "number" ? (
                        <Input
                          type="number"
                          value={val}
                          onChange={(e) => handleDynamicChange(field.id, e.target.value)}
                          required={field.is_required}
                          placeholder={`Enter ${field.label}...`}
                          className="rounded-xl text-sm"
                        />
                      ) : (
                        <Input
                          type="text"
                          value={val}
                          onChange={(e) => handleDynamicChange(field.id, e.target.value)}
                          required={field.is_required}
                          placeholder={`Enter ${field.label}...`}
                          className="rounded-xl text-sm"
                        />
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))}

          {/* DYNAMIC DOCUMENT FIELDS LOADED FROM SCHOOL'S ADMISSION FORM CONFIGURATION */}
          {activeForm.document_fields && activeForm.document_fields.length > 0 && (
            <Card className="rounded-2xl border-gray-200 dark:border-zinc-800 shadow-sm overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-slate-100 dark:from-zinc-900 dark:to-zinc-800 border-b border-gray-100 dark:border-zinc-800 py-3.5 px-6">
                <div className="flex items-center gap-2">
                  <UploadCloud className="h-4 w-4 text-blue-600" />
                  <CardTitle className="text-sm font-bold text-gray-900 dark:text-zinc-100">
                    Required Document Uploads ({activeForm.document_fields.length})
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {activeForm.document_fields.map((docField) => (
                  <div key={docField.id} className="p-3.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-800 dark:text-zinc-200">
                        {docField.label} {docField.is_required && <span className="text-red-500">*</span>}
                      </span>
                      {docFiles[docField.id] && (
                        <span className="inline-flex items-center text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          <FileCheck size={12} className="mr-1" /> Selected
                        </span>
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => handleFileChange(docField.id, e.target.files?.[0] || null)}
                      className="block w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-colors"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Submit Action Bar */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/clerk/students")}
              className="px-6 py-2.5 rounded-xl text-sm font-medium"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-md flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Submitting...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" /> Submit Admission Application
                </>
              )}
            </Button>
          </div>
        </form>
      ) : (
        <div className="p-8 text-center bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800">
          <AlertCircle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-gray-900 dark:text-zinc-100">No Active Admission Form Found</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
            Please configure and activate an admission form under Admission Form Builder before taking manual admissions.
          </p>
        </div>
      )}
    </div>
  );
}
