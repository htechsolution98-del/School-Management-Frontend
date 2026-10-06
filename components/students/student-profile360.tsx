"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { camelCaseText } from "@/lib/table-utils";
import { ArrowLeft, CheckCircle2, FileText, GraduationCap, Loader2, Pencil, RefreshCw, ShieldCheck, ShieldX, UserRound, CreditCard, Users, MapPin } from "lucide-react";
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
import { StudentPhoto, StatusPill, ProfileSection, DetailGrid, dateText, fieldLabel } from "./student-profile-parts";

const tabs = [{ id: "overview", name: "Overview", icon: UserRound }, { id: "personal", name: "Personal", icon: UserRound }, { id: "academic", name: "Academic", icon: GraduationCap }, { id: "family", name: "Parents & Guardians", icon: Users }, { id: "contact", name: "Contact & Address", icon: MapPin }, { id: "ids", name: "Government IDs", icon: CreditCard }, { id: "verification", name: "Verification", icon: ShieldCheck }, { id: "documents", name: "Documents", icon: FileText }];
export function StudentProfile360({ studentId }: { studentId: number }) {
  const [student, setStudent] = useState<StudentProfileData | null>(null);
  const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const [tab, setTab] = useState("overview"); const [verifying, setVerifying] = useState(false); const verifyRef = useRef(false);
  const confirm = useConfirm();
  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setError("");
    try {
      if (!Number.isSafeInteger(studentId) || studentId < 1) throw new Error("Invalid student profile link.");
      const current = await getStudentProfile(studentId, signal);
      if (!signal?.aborted) setStudent(current);
    } catch (err) { if (!signal?.aborted) setError(err instanceof Error ? err.message : "Unable to load this student."); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, [studentId]);
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load]);
  async function toggleVerification() {
    if (!student || verifyRef.current) return;
    verifyRef.current = true; setVerifying(true);
    try {
      if (!await confirm(student.is_verified ? "Revoke this student's verification?" : "Confirm that you have reviewed this student's details and documents before verifying.")) return;
      const updated = await updateStudentProfile(student.id, { is_verified: !student.is_verified });
      setStudent(updated); toast.success(updated.is_verified ? "Student verified successfully." : "Student verification revoked.");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Unable to update verification."); }
    finally { verifyRef.current = false; setVerifying(false); }
  }
  if (loading) return <div className="space-y-6" aria-label="Loading student profile"><Skeleton className="h-8 w-48" /><Skeleton className="h-44 w-full rounded-2xl" /><div className="grid gap-4 sm:grid-cols-3">{[1, 2, 3].map(value => <Skeleton key={value} className="h-24 rounded-2xl" />)}</div><Skeleton className="h-80 w-full rounded-2xl" /></div>;
  if (error || !student) return <div className="space-y-5"><Link href="/clerk/student-profiles" className="inline-flex items-center gap-2 text-sm text-[#1D496C] dark:text-sky-300"><ArrowLeft className="h-4 w-4" />Student Profiles</Link><ProfileSection title="Student profile unavailable"><p role="alert" className="text-sm text-rose-600 dark:text-rose-300">{error || "Student was not found in your school."}</p><Button variant="outline" className="mt-4" onClick={() => void load()}>Retry</Button></ProfileSection></div>;
  const personal = [{ label: "Full name", value: student.full_name }, { label: "First name", value: student.name }, { label: "Surname", value: student.surname }, { label: "Date of birth", value: dateText(student.date_of_birth) }, { label: "Admission date", value: dateText(student.admission_date) }, { label: "Record status", value: student.is_active ? "Active" : "Inactive" }];
  const academic = [{ label: "GR number", value: student.gr_no }, { label: "Class", value: student.class_name }, { label: "Division", value: student.division }, { label: "Roll number", value: student.roll_no }, { label: "Academic year", value: student.academic_year_name }, { label: "Admission number", value: student.admission_number }, { label: "Admission type", value: student.is_rte ? "RTE" : "Regular" }, { label: "Created date", value: dateText(student.created_at) }];
  const sectionPatterns: Record<string, RegExp> = { personal: /personal|identity|student|birth|gender|blood|religion|caste/i, academic: /academic|school|class|division|roll|education/i, family: /parent|guardian|family|father|mother/i, contact: /contact|address|communication|residence|mobile|email|city|district|pincode|country|state/i };
  const dynamicSections = student.sections.map(section => ({ ...section, fields: tab === "overview" || sectionPatterns[tab]?.test(section.title) ? section.fields : section.fields.filter(field => sectionPatterns[tab]?.test(field.label)) })).filter(section => section.fields.length > 0);
  return <div className="mx-auto w-full max-w-7xl min-w-0 space-y-5 text-slate-900 dark:text-zinc-100">
    <div className="flex flex-wrap items-center justify-between gap-3"><Link href="/clerk/student-profiles" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-indigo-600 dark:text-zinc-300"><ArrowLeft className="h-4 w-4" />All Student Profiles</Link><Button variant="outline" onClick={() => void load()}><RefreshCw className="h-4 w-4" />Refresh</Button></div>
    <header className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-7"><div className="flex flex-wrap items-center gap-5"><StudentPhoto src={student.photo_url} name={student.full_name} large /><div className="min-w-0 flex-1 basis-48"><p className="text-xs font-medium uppercase tracking-wider text-[#1D496C] dark:text-sky-300">Student Profile</p><h1 className="mt-2 break-words text-2xl font-semibold tracking-tight sm:text-3xl">{camelCaseText(student.full_name)}</h1><p className="mt-2 text-sm text-slate-500 dark:text-zinc-400">GR {student.gr_no || "Not assigned"} · {student.class_name || "Class not assigned"}{student.division ? ` / ${student.division}` : ""} · Roll {student.roll_no || "Not assigned"}</p><div className="mt-3 flex flex-wrap gap-2"><StatusPill verified={student.is_verified} /><StatusPill verified={!student.completion.missing_ids.length} label={student.completion.missing_ids.length ? `${student.completion.missing_ids.length} ID(s) missing` : "Government IDs added"} /></div></div><Button className="w-full sm:w-auto" variant={student.is_verified ? "outline" : "default"} disabled={verifying} onClick={() => void toggleVerification()}>{verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : student.is_verified ? <ShieldX className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}{student.is_verified ? "Revoke verification" : "Verify student"}</Button></div></header>
    <div className="grid gap-4 sm:grid-cols-3">{[{ label: "Uploaded documents", value: student.completion.document_count, icon: FileText }, { label: "Missing required documents", value: student.completion.missing_documents.length, icon: CheckCircle2 }, { label: "Government IDs added", value: `${3 + (student.custom_ids || []).length - student.completion.missing_ids.length} / ${3 + (student.custom_ids || []).length}`, icon: CreditCard }].map(card => <div key={card.label} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"><div className="rounded-xl bg-sky-50 p-3 text-[#1D496C] dark:bg-sky-950 dark:text-sky-300"><card.icon className="h-5 w-5" /></div><div><p className="text-xs text-slate-500 dark:text-zinc-400">{card.label}</p><p className="mt-1 text-2xl font-semibold">{card.value}</p></div></div>)}</div>
    <nav aria-label="Student profile sections" className="flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 dark:border-zinc-800 dark:bg-zinc-900">{tabs.map(item => <button key={item.id} type="button" aria-current={tab === item.id ? "page" : undefined} onClick={() => setTab(item.id)} className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-indigo-500 sm:text-sm ${tab === item.id ? "bg-[#1D496C] text-white shadow-sm dark:bg-sky-400/15 dark:text-sky-200" : "text-slate-500 hover:bg-slate-50 dark:text-zinc-400 dark:hover:bg-zinc-800"}`}><item.icon className="h-4 w-4" />{item.name}{item.id === "documents" ? ` (${student.completion.document_count})` : ""}</button>)}</nav>
    <div className={tab === "overview" ? "grid items-start gap-5 xl:grid-cols-2" : "space-y-5"}>
      {(tab === "overview" || tab === "personal") && <ProfileSection title="Personal Details"><DetailGrid values={personal} /></ProfileSection>}
      {(tab === "overview" || tab === "academic") && <ProfileSection title="Academic & Class Details"><DetailGrid values={academic} /></ProfileSection>}
      {(tab === "overview" || tab === "family") && <ProfileSection title="Parent & Guardian Details"><DetailGrid values={[{ label: "Father's name", value: student.father_name }, { label: "Mother's name", value: student.mother_name }]} />{student.guardians.map(guardian => <div key={guardian.id} className="mt-5 border-t border-slate-100 pt-5 dark:border-zinc-800"><DetailGrid values={[{ label: "Linked guardian", value: guardian.name }, { label: "Email", value: guardian.email }]} /></div>)}</ProfileSection>}
      {(tab === "overview" || tab === "contact") && <ProfileSection title="Contact Information"><DetailGrid values={[{ label: "Mobile", value: student.mobile }, { label: "Email", value: student.email }]} />{tab === "contact" && !dynamicSections.length && <p className="mt-4 text-sm text-slate-500 dark:text-zinc-400">No separate address details are recorded for this student.</p>}</ProfileSection>}
      {(tab === "overview" || tab === "ids") && <GovernmentIDs key={student.id} student={student} onUpdated={setStudent} onRefresh={() => load()} />}
      {(tab === "overview" || tab === "verification") && <ProfileSection title="Verification Details"><DetailGrid values={[{ label: "Status", value: student.is_verified ? "Verified" : "Pending verification" }, { label: "Verified by", value: student.verified_by_name }, { label: "Verified date", value: dateText(student.verified_at) }, { label: "Missing IDs", value: student.completion.missing_ids.join(", ") || "None" }, { label: "Missing required documents", value: student.completion.missing_documents.map(document => document.label).join(", ") || "None" }, { label: "Document requirements", value: student.completion.document_requirements_known ? "From student's admission form" : "No admission requirements configured" }]} /><p className="mt-5 text-xs text-slate-500 dark:text-zinc-400">Verification is a manual Clerk action. Adding IDs or documents does not automatically verify the student.</p></ProfileSection>}
      {tab === "documents" && <StudentDocuments student={student} onUpdated={setStudent} onRefresh={() => load()} />}
      {dynamicSections.map(section => <ProfileSection key={section.title} title={section.title}><DetailGrid values={section.fields.map(field => ({ label: field.label, value: field.sensitive ? maskAadhaar(field.value == null ? null : String(field.value)) : field.value }))} /></ProfileSection>)}
      {(tab === "overview" || tab === "personal" || tab === "academic") && student.extra_details.map((extra, index) => <ProfileSection key={index} title="Additional Student Details"><DetailGrid values={Object.entries(extra).map(([key, value]) => ({ label: fieldLabel(key), value }))} /></ProfileSection>)}
    </div>
  </div>;
}

function GovernmentIDs({ student, onUpdated, onRefresh }: { student: StudentProfileData; onUpdated: (student: StudentProfileData) => void; onRefresh: () => Promise<void> }) {
  const [editing, setEditing] = useState(false); const [saving, setSaving] = useState(false); const savingRef = useRef(false);
  const [values, setValues] = useState({ aadhar_number: "", abc_id: "", udise_no: "" });
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  function edit() { setCustomValues(Object.fromEntries((student.custom_ids || []).map(field => [String(field.id), field.value]))); setValues({ aadhar_number: student.aadhar_number || "", abc_id: student.abc_id || "", udise_no: student.udise_no || "" }); setErrors({}); setEditing(true); }
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (savingRef.current) return;
    const parsed = governmentIDsSchema.safeParse(values);
    if (!parsed.success) { setErrors(Object.fromEntries(parsed.error.issues.map(issue => [String(issue.path[0]), issue.message]))); return; }
    savingRef.current = true; setSaving(true); setErrors({});
    try { const current = await updateStudentProfile(student.id, { ...parsed.data, custom_id_values: customValues }); onUpdated(current); setEditing(false); toast.success("Government & education IDs saved."); }
    catch (err) { const message = err instanceof Error ? err.message : "Unable to save IDs."; setErrors({ form: message }); toast.error(message); }
    finally { savingRef.current = false; setSaving(false); }
  }
  const fields = [{ key: "aadhar_number" as const, label: "Aadhaar Number" }, { key: "abc_id" as const, label: "ABC / APAAR ID" }, { key: "udise_no" as const, label: "UDISE / PEN" }];
  return <ProfileSection title="Government & Education IDs"><div className="mb-5 flex justify-end"><SchoolProfileFieldEditor kind="ID" onAdded={onRefresh} disabled={editing || saving} /></div>{editing ? <form onSubmit={save} className="space-y-5"><div className="grid gap-4 sm:grid-cols-3">{fields.map(field => <div key={field.key}><Label htmlFor={field.key}>{field.label}</Label><Input id={field.key} value={values[field.key]} maxLength={field.key === "aadhar_number" ? 12 : 50} inputMode={field.key === "aadhar_number" ? "numeric" : "text"} autoComplete="off" disabled={saving} aria-invalid={!!errors[field.key]} aria-describedby={errors[field.key] ? `${field.key}-error` : undefined} className="mt-2 font-mono" onChange={event => setValues(current => ({ ...current, [field.key]: event.target.value }))} />{errors[field.key] && <p id={`${field.key}-error`} className="mt-2 text-xs text-rose-600 dark:text-rose-300">{errors[field.key]}</p>}</div>)}{(student.custom_ids || []).map(field => <div key={field.id}><Label htmlFor={`custom-id-${field.id}`}>{camelCaseText(field.label)}</Label><Input id={`custom-id-${field.id}`} value={customValues[String(field.id)] || ""} maxLength={255} disabled={saving} className="mt-2" onChange={event => setCustomValues(current => ({ ...current, [field.id]: event.target.value }))} /></div>)}</div>{errors.form && <p role="alert" className="text-sm text-rose-600 dark:text-rose-300">{errors.form}</p>}<div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={saving} onClick={() => setEditing(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />}{saving ? "Saving…" : "Save IDs"}</Button></div></form> : <><div className="grid gap-4 sm:grid-cols-3">{fields.map(field => <div key={field.key} className="min-w-0 rounded-xl bg-slate-50 p-4 dark:bg-zinc-800"><p className="text-xs font-medium text-slate-500 dark:text-zinc-400">{camelCaseText(field.label)}</p><p className="my-3 break-all font-mono text-sm font-semibold">{field.key === "aadhar_number" ? maskAadhaar(student.aadhar_number) : student[field.key] || "Not added"}</p><StatusPill verified={!!student[field.key]} label={student[field.key] ? student.is_verified ? "Added · Student verified" : "Added" : "Missing"} /></div>)}{(student.custom_ids || []).map(field => <div key={field.id} className="min-w-0 rounded-xl bg-slate-50 p-4 dark:bg-zinc-800"><p className="text-xs font-medium text-slate-500 dark:text-zinc-400">{camelCaseText(field.label)}</p><p className="my-3 break-all font-mono text-sm font-semibold">{field.value || "Not added"}</p><StatusPill verified={!!field.value} label={field.value ? "Added" : "Missing"} /></div>)}</div><div className="mt-5 flex flex-wrap items-center justify-between gap-4"><p className="text-xs text-slate-500 dark:text-zinc-400">Aadhaar is masked in normal display. IDs are saved to the student&apos;s existing record.</p><Button variant="outline" onClick={edit}><Pencil className="h-4 w-4" />Edit IDs</Button></div></>}</ProfileSection>;
}

