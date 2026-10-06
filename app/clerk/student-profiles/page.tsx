"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { camelCaseText } from "@/lib/table-utils";
import { Users, RefreshCw, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable, dynamicOptions, type DataTableColumn } from "@/components/data-table";
import { getStudentProfiles } from "@/lib/clerk/student-profiles";
import type { StudentProfileData } from "@/types/student-profile";
import { StudentPhoto, StatusPill } from "@/components/students/student-profile-parts";

export default function StudentProfilesPage() {
  const [students, setStudents] = useState<StudentProfileData[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setError("");
    try { const data = await getStudentProfiles(signal); if (!signal?.aborted) setStudents(data); }
    catch (err) { if (!signal?.aborted) setError(err instanceof Error ? err.message : "Unable to load students."); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, []);
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load]);
  const columns = useMemo<DataTableColumn<StudentProfileData>[]>(() => [
    { key: "name", header: "Student", sticky: true, search: row => [row.full_name, row.name, row.surname], render: row => <Link href={`/clerk/student-profiles/${row.id}`} className="flex min-w-44 items-center gap-3 font-semibold text-slate-900 hover:text-indigo-600 dark:text-zinc-100 dark:hover:text-indigo-300"><StudentPhoto src={row.photo_url} name={row.full_name} /><span className="whitespace-normal">{camelCaseText(row.full_name)}</span></Link> },
    { key: "gr_no", header: "GR No.", search: row => row.gr_no, camelCase: false, render: row => row.gr_no || "Not assigned" },
    { key: "class_name", header: "Class", search: row => row.class_name, render: row => camelCaseText(row.class_name) || "Not assigned" },
    { key: "division", header: "Division", search: row => row.division, render: row => row.division || "Not assigned" },
    { key: "roll_no", header: "Roll No.", search: row => row.roll_no, camelCase: false, render: row => row.roll_no || "Not assigned" },
    { key: "mobile", header: "Contact", search: row => [row.mobile, row.father_name, row.mother_name, row.email], camelCase: false, render: row => <div className="space-y-1"><p>{row.mobile || "Not recorded"}</p>{row.father_name && <p className="text-xs text-slate-500 dark:text-zinc-400">{row.father_name}</p>}</div> },
    { key: "abc_id", header: "ABC / APAAR", search: row => row.abc_id, camelCase: false, render: row => <div className="space-y-2"><p className="text-xs">{row.abc_id || "Not added"}</p><StatusPill verified={!!row.abc_id} label={row.abc_id ? "Added" : "Missing"} /></div> },
    { key: "udise_no", header: "UDISE / PEN", search: row => row.udise_no, camelCase: false, render: row => <div className="space-y-2"><p className="text-xs">{row.udise_no || "Not added"}</p><StatusPill verified={!!row.udise_no} label={row.udise_no ? "Added" : "Missing"} /></div> },
    { key: "documents", header: "Documents", render: row => <div className="space-y-1"><p>{row.completion.document_count} uploaded</p>{row.completion.missing_documents.length > 0 && <p className="text-xs text-amber-700 dark:text-amber-300">{row.completion.missing_documents.length} required missing</p>}</div> },
    { key: "is_verified", header: "Verification", render: row => <StatusPill verified={row.is_verified} /> },
  ], []);
  const verified = students.filter(student => student.is_verified).length;
  return <div className="student-profile-list min-w-0 space-y-6 text-slate-900 dark:text-zinc-100"><header className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-medium uppercase tracking-wider text-indigo-600 dark:text-indigo-300">School Management</p><h1 className="mt-2 flex items-center gap-3 text-2xl font-semibold tracking-tight"><Users className="h-7 w-7 text-indigo-600 dark:text-indigo-300" />Student Profiles</h1><p className="mt-2 text-sm text-slate-500 dark:text-zinc-400">A complete directory of your school&apos;s enrolled students across every class and division.</p></div><Button variant="outline" disabled={loading} onClick={() => void load()}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh</Button></header>
    <div className="grid gap-4 sm:grid-cols-3">{[{ label: "All students", value: students.length }, { label: "Verified students", value: verified }, { label: "Pending verification", value: students.length - verified }].map(card => <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"><p className="text-xs text-slate-500 dark:text-zinc-400">{card.label}</p>{loading ? <Skeleton className="mt-2 h-8 w-16" /> : <p className="mt-2 text-2xl font-semibold">{card.value}</p>}</div>)}</div>
    {loading ? <div aria-label="Loading student profiles" className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"><Skeleton className="h-10 w-full" />{Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-16 w-full" />)}</div> : <DataTable data={students} columns={columns} getRowId={row => row.id} error={error} search searchPlaceholder="Search name, GR, roll, mobile, APAAR or PEN" searchAriaLabel="Search student profiles" searchExtra={row => [row.aadhar_number, ...row.guardians.map(guardian => guardian.name)]} createdDateRange caption="School-wide Student Profiles" minWidth={1400} pageSize={10} emptyTitle="No enrolled students yet" emptyDescription="Students added through admission or manual entry will appear here." noResultsTitle="No students match your filters" noResultsDescription="Try another search or clear the filters." filters={[
      { key: "class", label: "Class", optionsFrom: rows => dynamicOptions(rows, row => row.class_name), match: (row, value) => row.class_name === value },
      { key: "division", label: "Division", optionsFrom: rows => dynamicOptions(rows, row => row.division), match: (row, value) => row.division === value },
      { key: "verified", label: "Verification", options: [{ value: "yes", label: "Verified" }, { value: "no", label: "Pending" }], match: (row, value) => row.is_verified === (value === "yes") },
      { key: "missing", label: "Missing Documents / IDs", options: [{ value: "ids", label: "Missing government IDs" }, { value: "documents", label: "Missing required documents" }, { value: "none", label: "No documents uploaded" }], match: (row, value) => value === "ids" ? !!row.completion.missing_ids.length : value === "documents" ? !!row.completion.missing_documents.length : row.completion.document_count === 0 },
    ]} renderActions={row => <Link href={`/clerk/student-profiles/${row.id}`} className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-indigo-600 hover:bg-indigo-50 focus-visible:outline-2 dark:border-zinc-700 dark:text-indigo-300 dark:hover:bg-indigo-950">View Profile<ArrowUpRight className="h-3.5 w-3.5" /></Link>} />}
    {error && <Button variant="outline" onClick={() => void load()}>Retry loading students</Button>}
  </div>;
}
