"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { camelCaseText } from "@/lib/table-utils";
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  GraduationCap,
  Loader2,
  Pencil,
  RefreshCw,
  ShieldCheck,
  ShieldX,
  UserRound,
  CreditCard,
  Users,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useConfirm } from "@/components/providers/confirm-provider";
import { getStudentProfile, updateStudentProfile } from "@/lib/clerk/student-profiles";
import { governmentIDsSchema, maskAadhaar } from "@/lib/student-profile-validation";
import type { StudentProfileData } from "@/types/student-profile";
import { SchoolProfileFieldEditor } from "./school-profile-field-editor";
import { StudentDocuments } from "./student-documents";
import {
  StudentPhoto,
  StatusPill,
  ProfileSection,
  DetailGrid,
  dateText,
  fieldLabel,
} from "./student-profile-parts";

const tabs = [
  { id: "overview", name: "Overview", icon: UserRound },
  { id: "personal", name: "Personal", icon: UserRound },
  { id: "academic", name: "Academic", icon: GraduationCap },
  { id: "family", name: "Parents & Guardians", icon: Users },
  { id: "contact", name: "Contact & Address", icon: MapPin },
  { id: "ids", name: "Government IDs", icon: CreditCard },
  { id: "verification", name: "Verification", icon: ShieldCheck },
  { id: "documents", name: "Documents", icon: FileText },
];

export function StudentProfile360({ studentId }: { studentId: number }) {
  const [student, setStudent] = useState<StudentProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("overview");
  const [verifying, setVerifying] = useState(false);
  const verifyRef = useRef(false);
  const confirm = useConfirm();

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError("");
      try {
        if (!Number.isSafeInteger(studentId) || studentId < 1) {
          throw new Error("Invalid student profile link.");
        }
        const current = await getStudentProfile(studentId, signal);
        if (!signal?.aborted) setStudent(current);
      } catch (err) {
        if (!signal?.aborted) {
          setError(err instanceof Error ? err.message : "Unable to load this student.");
        }
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [studentId]
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  async function toggleVerification() {
    if (!student || verifyRef.current) return;
    verifyRef.current = true;
    setVerifying(true);
    try {
      if (
        !(await confirm(
          student.is_verified
            ? "Revoke this student's verification?"
            : "Confirm that you have reviewed this student's details and documents before verifying."
        ))
      )
        return;
      const updated = await updateStudentProfile(student.id, {
        is_verified: !student.is_verified,
      });
      setStudent(updated);
      toast.success(
        updated.is_verified
          ? "Student verified successfully."
          : "Student verification revoked."
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to update verification.");
    } finally {
      verifyRef.current = false;
      setVerifying(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto" aria-label="Loading student profile">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-12 w-full rounded-2xl" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="space-y-4 max-w-6xl mx-auto">
        <Link
          href="/clerk/student-profiles"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-indigo-600"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All Student Profiles
        </Link>
        <ProfileSection title="Student profile unavailable">
          <p role="alert" className="text-sm text-rose-600">
            {error || "Student was not found in your school."}
          </p>
          <Button variant="outline" size="sm" className="mt-3 text-xs" onClick={() => void load()}>
            Retry
          </Button>
        </ProfileSection>
      </div>
    );
  }

  // Dynamic field helper to extract address and demographic info if not directly set
  const getFieldValue = (pattern: RegExp) => {
    for (const sec of student.sections || []) {
      for (const f of sec.fields || []) {
        if (pattern.test(f.label) && f.value) return String(f.value).trim();
      }
    }
    return null;
  };

  const addressLine = student.address || getFieldValue(/address/i);
  const city = getFieldValue(/city|village|town/i);
  const district = getFieldValue(/district/i);
  const state = getFieldValue(/state/i);
  const pincode = getFieldValue(/pincode|pin code|zip/i);
  const admissionDateVal = student.admission_date || student.created_at;
  const academicYearVal = student.academic_year_name || "2026-2027";

  const personal = [
    { label: "Full name", value: student.full_name },
    { label: "First name", value: student.name },
    { label: "Surname", value: student.surname },
    { label: "Date of birth", value: dateText(student.date_of_birth) },
    { label: "Admission date", value: dateText(admissionDateVal) },
    { label: "Record status", value: student.is_active ? "Active" : "Inactive" },
  ];

  const academic = [
    { label: "GR number", value: student.gr_no },
    { label: "Class", value: student.class_name },
    { label: "Division", value: student.division },
    { label: "Roll number", value: student.roll_no },
    { label: "Academic year", value: academicYearVal },
    { label: "Admission number", value: student.admission_number },
    { label: "Admission type", value: student.is_rte ? "RTE" : "Regular" },
    { label: "Created date", value: dateText(student.created_at) },
  ];

  const sectionPatterns: Record<string, RegExp> = {
    personal: /personal|identity|student|birth|gender|blood|religion|caste/i,
    academic: /academic|school|class|division|roll|education/i,
    family: /parent|guardian|family|father|mother/i,
    contact: /contact|address|communication|residence|mobile|email|city|district|pincode|country|state/i,
  };

  const dynamicSections = student.sections
    .map((section) => ({
      ...section,
      fields:
        sectionPatterns[tab]?.test(section.title)
          ? section.fields
          : section.fields.filter((field) => sectionPatterns[tab]?.test(field.label)),
    }))
    .filter((section) => section.fields.length > 0);

  return (
    <div className="mx-auto w-full max-w-6xl min-w-0 space-y-6 text-slate-900 dark:text-zinc-100">
      {/* ─── Top Breadcrumb / Action Bar ───────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/clerk/student-profiles"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Student Profiles
        </Link>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void load()}
          className="h-8 text-xs font-semibold text-slate-700 hover:text-slate-900 border-slate-200/80 bg-white shadow-2xs hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Refresh
        </Button>
      </div>

      {/* ─── Top Summary Banner (Hero Section) ──────────────── */}
      <header className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6">
          <div className="flex items-center gap-4 sm:gap-5 min-w-0">
            <StudentPhoto src={student.photo_url} name={student.full_name} large={true} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="truncate text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {camelCaseText(student.full_name)}
                </h1>
                <StatusPill verified={student.is_verified} />
                {student.is_rte && (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-900">
                    RTE
                  </span>
                )}
              </div>
              <div className="mt-2.5 flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-xs text-slate-500 dark:text-zinc-400">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold uppercase tracking-wider text-[11px] text-slate-400 dark:text-zinc-500">GR No:</span>
                  <span className="font-semibold text-slate-800 dark:text-zinc-200">{student.gr_no || "Pending"}</span>
                </div>
                <span className="text-slate-300 dark:text-zinc-700 hidden sm:inline">·</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold uppercase tracking-wider text-[11px] text-slate-400 dark:text-zinc-500">Class:</span>
                  <span className="font-semibold text-slate-800 dark:text-zinc-200">{student.class_name || "N/A"}{student.division ? ` (${student.division})` : ""}</span>
                </div>
                <span className="text-slate-300 dark:text-zinc-700 hidden sm:inline">·</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold uppercase tracking-wider text-[11px] text-slate-400 dark:text-zinc-500">Roll No:</span>
                  <span className="font-semibold text-slate-800 dark:text-zinc-200">{student.roll_no || "—"}</span>
                </div>
                <span className="text-slate-300 dark:text-zinc-700 hidden sm:inline">·</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold uppercase tracking-wider text-[11px] text-slate-400 dark:text-zinc-500">Adm No:</span>
                  <span className="font-semibold text-slate-800 dark:text-zinc-200">{student.admission_number || "—"}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
            <Button
              size="default"
              variant={student.is_verified ? "outline" : "default"}
              disabled={verifying}
              onClick={() => void toggleVerification()}
              className={
                student.is_verified
                  ? "h-9 px-4 text-xs sm:text-sm font-semibold border-slate-200/80 text-slate-700 hover:bg-slate-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800 hover:text-rose-600 shadow-2xs"
                  : "h-9 px-4 text-xs sm:text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              }
            >
              {verifying ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : student.is_verified ? (
                <ShieldX className="h-4 w-4 mr-2 text-rose-500" />
              ) : (
                <ShieldCheck className="h-4 w-4 mr-2" />
              )}
              {student.is_verified ? "Revoke Verification" : "Verify Student"}
            </Button>
          </div>
        </div>
      </header>

      {/* ─── Unified KPI Metric Strip ────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-zinc-800 rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden">
        <div className="flex items-center gap-3.5 p-4 sm:px-6">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Uploaded Docs</p>
            <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-tight mt-0.5">{student.completion.document_count}</p>
          </div>
        </div>

        <div className="flex items-center gap-3.5 p-4 sm:px-6">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${student.completion.missing_documents.length ? "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400" : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400"}`}>
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Missing Docs</p>
            <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-tight mt-0.5">{student.completion.missing_documents.length}</p>
          </div>
        </div>

        <div className="flex items-center gap-3.5 p-4 sm:px-6">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Govt IDs Added</p>
            <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-tight mt-0.5">
              {3 + (student.custom_ids || []).length - student.completion.missing_ids.length} / {3 + (student.custom_ids || []).length}
            </p>
          </div>
        </div>
      </div>

      {/* ─── Integrated Navigation Tabs ─────────────────────── */}
      <nav
        aria-label="Student profile sections"
        className="flex gap-1.5 overflow-x-auto rounded-2xl border border-slate-200/80 bg-white p-1.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 scrollbar-none"
      >
        {tabs.map((item) => {
          const isActive = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-current={isActive ? "page" : undefined}
              onClick={() => setTab(item.id)}
              className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold transition-all ${
                isActive
                  ? "bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900"
                  : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              }`}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.name}</span>
              {item.id === "documents" && (
                <span
                  className={`text-[11px] px-1.5 py-0.5 rounded-full font-bold ${
                    isActive
                      ? "bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900"
                      : "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-300"
                  }`}
                >
                  {student.completion.document_count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* ─── Unified Content Panels ─────────────────────────── */}
      <div className="w-full max-w-6xl mx-auto">
        {tab === "overview" ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Left Column */}
            <div className="space-y-6">
              <ProfileSection title="Personal Details">
                <DetailGrid values={personal} cols={2} />
              </ProfileSection>

              <ProfileSection title="Parent & Guardian Details">
                <DetailGrid
                  values={[
                    { label: "Father's name", value: student.father_name },
                    { label: "Mother's name", value: student.mother_name },
                  ]}
                  cols={2}
                />
                {student.guardians.length > 0 && (
                  <div className="mt-5 border-t border-slate-100 pt-5 dark:border-zinc-800">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Linked Parent Accounts</p>
                    <DetailGrid
                      values={student.guardians.map((g) => ({
                        label: "Account Name",
                        value: g.name,
                      }))}
                      cols={2}
                    />
                  </div>
                )}
              </ProfileSection>

              <GovernmentIDs key={student.id} student={student} onUpdated={setStudent} onRefresh={() => load()} />
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              <ProfileSection title="Academic & Class Details">
                <DetailGrid values={academic} cols={2} />
              </ProfileSection>

              <ProfileSection title="Contact & Address">
                <DetailGrid
                  values={[
                    { label: "Mobile number", value: student.mobile },
                    { label: "Email address", value: student.email },
                    { label: "Address line", value: addressLine },
                    { label: "City / District", value: [city, district].filter(Boolean).join(" · ") || city || district },
                    { label: "State", value: state },
                    { label: "Pincode", value: pincode },
                  ].filter((item) => item.value !== null && item.value !== undefined && item.value !== "")}
                  cols={2}
                />
              </ProfileSection>

              <ProfileSection title="Verification Details">
                <DetailGrid
                  values={[
                    { label: "Status", value: student.is_verified ? "Verified" : "Pending verification" },
                    { label: "Verified by", value: student.verified_by_name },
                    { label: "Verified date", value: dateText(student.verified_at) },
                    { label: "Missing IDs", value: student.completion.missing_ids.join(", ") || "None" },
                    {
                      label: "Missing required documents",
                      value: student.completion.missing_documents.map((d) => d.label).join(", ") || "None",
                    },
                    {
                      label: "Document requirements",
                      value: student.completion.document_requirements_known
                        ? "From admission form"
                        : "Standard",
                    },
                  ]}
                  cols={2}
                />
              </ProfileSection>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {tab === "personal" && (
              <ProfileSection title="Personal Details">
                <DetailGrid values={personal} cols={3} />
              </ProfileSection>
            )}

            {tab === "academic" && (
              <ProfileSection title="Academic & Class Details">
                <DetailGrid values={academic} cols={3} />
              </ProfileSection>
            )}

            {tab === "family" && (
              <ProfileSection title="Parent & Guardian Details">
                <DetailGrid
                  values={[
                    { label: "Father's name", value: student.father_name },
                    { label: "Mother's name", value: student.mother_name },
                  ]}
                  cols={2}
                />
                {student.guardians.length > 0 && (
                  <div className="mt-5 border-t border-slate-100 pt-5 dark:border-zinc-800">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Linked Parent Accounts</p>
                    <DetailGrid
                      values={student.guardians.map((g) => ({
                        label: "Account Name",
                        value: g.name,
                      }))}
                      cols={3}
                    />
                  </div>
                )}
              </ProfileSection>
            )}

            {tab === "contact" && (
              <ProfileSection title="Contact & Address">
                <DetailGrid
                  values={[
                    { label: "Mobile number", value: student.mobile },
                    { label: "Email address", value: student.email },
                    { label: "Address line", value: addressLine },
                    { label: "City / District", value: [city, district].filter(Boolean).join(" · ") || city || district },
                    { label: "State", value: state },
                    { label: "Pincode", value: pincode },
                  ].filter((item) => item.value !== null && item.value !== undefined && item.value !== "")}
                  cols={3}
                />
              </ProfileSection>
            )}

            {tab === "ids" && (
              <GovernmentIDs key={student.id} student={student} onUpdated={setStudent} onRefresh={() => load()} />
            )}

            {tab === "verification" && (
              <ProfileSection title="Verification Details">
                <DetailGrid
                  values={[
                    { label: "Status", value: student.is_verified ? "Verified" : "Pending verification" },
                    { label: "Verified by", value: student.verified_by_name },
                    { label: "Verified date", value: dateText(student.verified_at) },
                    { label: "Missing IDs", value: student.completion.missing_ids.join(", ") || "None" },
                    {
                      label: "Missing required documents",
                      value: student.completion.missing_documents.map((d) => d.label).join(", ") || "None",
                    },
                    {
                      label: "Document requirements",
                      value: student.completion.document_requirements_known
                        ? "From admission form"
                        : "Standard",
                    },
                  ]}
                  cols={3}
                />
              </ProfileSection>
            )}

            {tab === "documents" && (
              <StudentDocuments student={student} onUpdated={setStudent} onRefresh={() => load()} />
            )}

            {dynamicSections.map((section) => (
              <ProfileSection key={section.title} title={section.title}>
                <DetailGrid
                  values={section.fields.map((field) => ({
                    label: field.label,
                    value: field.sensitive
                      ? maskAadhaar(field.value == null ? null : String(field.value))
                      : field.value,
                  }))}
                  cols={3}
                />
              </ProfileSection>
            ))}

            {student.extra_details.map((extra, index) => (
              <ProfileSection key={index} title="Additional Details">
                <DetailGrid
                  values={Object.entries(extra).map(([key, value]) => ({
                    label: fieldLabel(key),
                    value,
                  }))}
                  cols={3}
                />
              </ProfileSection>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function GovernmentIDs({
  student,
  onUpdated,
  onRefresh,
}: {
  student: StudentProfileData;
  onUpdated: (student: StudentProfileData) => void;
  onRefresh: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [values, setValues] = useState({ aadhar_number: "", abc_id: "", udise_no: "" });
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  function edit() {
    setCustomValues(
      Object.fromEntries((student.custom_ids || []).map((field) => [String(field.id), field.value]))
    );
    setValues({
      aadhar_number: student.aadhar_number || "",
      abc_id: student.abc_id || "",
      udise_no: student.udise_no || "",
    });
    setErrors({});
    setEditing(true);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (savingRef.current) return;
    const parsed = governmentIDsSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(
        Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message]))
      );
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setErrors({});
    try {
      const current = await updateStudentProfile(student.id, {
        ...parsed.data,
        custom_id_values: customValues,
      });
      onUpdated(current);
      setEditing(false);
      toast.success("Government & education IDs saved.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to save IDs.";
      setErrors({ form: message });
      toast.error(message);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  const fields = [
    { key: "aadhar_number" as const, label: "Aadhaar Number" },
    { key: "abc_id" as const, label: "ABC / APAAR ID" },
    { key: "udise_no" as const, label: "UDISE / PEN" },
  ];

  return (
    <ProfileSection
      title="Government & Education IDs"
      action={
        <div className="flex items-center gap-2">
          <SchoolProfileFieldEditor kind="ID" onAdded={onRefresh} disabled={editing || saving} />
          {!editing && (
            <Button
              size="xs"
              variant="outline"
              className="h-7 text-xs font-semibold text-slate-700 hover:text-indigo-600 border-slate-200"
              onClick={edit}
            >
              <Pencil className="h-3 w-3 mr-1" />
              Edit IDs
            </Button>
          )}
        </div>
      }
    >
      {editing ? (
        <form onSubmit={save} className="space-y-3">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            {fields.map((field) => (
              <div key={field.key}>
                <Label htmlFor={field.key} className="text-xs font-semibold">
                  {field.label}
                </Label>
                <Input
                  id={field.key}
                  value={values[field.key]}
                  maxLength={field.key === "aadhar_number" ? 12 : 50}
                  inputMode={field.key === "aadhar_number" ? "numeric" : "text"}
                  autoComplete="off"
                  disabled={saving}
                  aria-invalid={!!errors[field.key]}
                  className="mt-1 h-8 text-xs font-mono"
                  onChange={(event) =>
                    setValues((current) => ({ ...current, [field.key]: event.target.value }))
                  }
                />
                {errors[field.key] && (
                  <p className="mt-1 text-[11px] text-rose-600">{errors[field.key]}</p>
                )}
              </div>
            ))}
            {(student.custom_ids || []).map((field) => (
              <div key={field.id}>
                <Label htmlFor={`custom-id-${field.id}`} className="text-xs font-semibold">
                  {camelCaseText(field.label)}
                </Label>
                <Input
                  id={`custom-id-${field.id}`}
                  value={customValues[String(field.id)] || ""}
                  maxLength={255}
                  disabled={saving}
                  className="mt-1 h-8 text-xs"
                  onChange={(event) =>
                    setCustomValues((current) => ({
                      ...current,
                      [field.id]: event.target.value,
                    }))
                  }
                />
              </div>
            ))}
          </div>
          {errors.form && <p role="alert" className="text-xs text-rose-600">{errors.form}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              size="xs"
              variant="outline"
              className="h-7 text-xs"
              disabled={saving}
              onClick={() => setEditing(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="xs"
              className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
              disabled={saving}
            >
              {saving && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
              {saving ? "Saving…" : "Save IDs"}
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
            {fields.map((field) => (
              <div key={field.key} className="min-w-0 flex flex-col justify-start">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400 leading-relaxed">
                    {camelCaseText(field.label)}
                  </span>
                  <StatusPill verified={!!student[field.key]} label={student[field.key] ? "Added" : "Missing"} />
                </div>
                <span className="mt-1 break-all font-mono text-sm sm:text-base font-semibold text-slate-900 dark:text-zinc-100">
                  {field.key === "aadhar_number"
                    ? maskAadhaar(student.aadhar_number)
                    : student[field.key] || "—"}
                </span>
              </div>
            ))}
            {(student.custom_ids || []).map((field) => (
              <div key={field.id} className="min-w-0 flex flex-col justify-start">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400 leading-relaxed">
                    {camelCaseText(field.label)}
                  </span>
                  <StatusPill verified={!!field.value} label={field.value ? "Added" : "Missing"} />
                </div>
                <span className="mt-1 break-all font-mono text-sm sm:text-base font-semibold text-slate-900 dark:text-zinc-100">
                  {field.value || "—"}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 dark:text-zinc-500 italic">Aadhaar is masked in normal display.</p>
        </div>
      )}
    </ProfileSection>
  );
}
