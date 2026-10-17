"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Eye, GraduationCap, RefreshCw } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { getStudentReport, type StudentReport, type StudentReportRow, type StrengthRow, type ExamSummaryRow, type StudentResultRow, type StudentFeeRow, type AttendanceReportRow } from "@/lib/trustee-student-report";

const money = (value: string | number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(value));
const pct = (value: number | null) => value === null ? "Not available" : `${value.toFixed(2)}%`;
const date = (value: string | null) => value ? new Date(value).toLocaleDateString("en-GB") : "Not recorded";
const human = (value: string) => value.replaceAll("_", " ");
const numberColumn = <T,>(key: keyof T & string, header: string): DataTableColumn<T> => ({ key, header, numeric: true, render: row => String(row[key]) });
const identity: DataTableColumn<StudentReportRow>[] = [
  { key: "name", header: "Student", render: row => <div><p className="font-semibold">{row.name}</p><p className="text-xs text-slate-500">#{row.id} · GR {row.gr_no || "—"} · Roll {row.roll_no || "—"}</p></div> },
  { key: "placement", header: "Class / division", render: row => `${row.class_name} / ${row.division}` },
];
const studentColumns: DataTableColumn<StudentReportRow>[] = [...identity,
  { key: "academic_year", header: "Current year", render: row => row.academic_year },
  { key: "status", header: "Status / lifecycle", render: row => <div>{row.is_active ? "Active" : "Inactive"}<p className="text-xs text-slate-500">{human(row.student_status)}</p></div> },
  { key: "gender", header: "Gender", render: row => row.gender }, { key: "category", header: "Category", render: row => row.category },
  { key: "admission_date", header: "Admitted", render: row => date(row.admission_date) },
  { key: "attendance", header: "Attendance", render: row => pct(row.attendance_percentage) },
  { key: "pending", header: "Pending dues", render: row => money(row.pending) },
  { key: "performance", header: "Published final", render: row => pct(row.final_percentage) },
];
const feeColumns: DataTableColumn<StudentReportRow>[] = [...identity,
  ...([['payable', 'Net payable'], ['credited_paid', 'Credited paid'], ['pending', 'Pending dues'], ['overdue_due', 'Overdue dues'], ['student_collection', 'Student receipts in period'], ['government_collection', 'Govt receipts in period'], ['govt_pending', 'Govt pending']] as const).map(([key, header]) => ({ key, header, render: (row: StudentReportRow) => money(row[key]) })),
];
const attendanceColumns: DataTableColumn<StudentReportRow>[] = [...identity, numberColumn("present", "Present"), numberColumn("absent", "Absent"), numberColumn("unmarked", "Unmarked / conflicting"), { key: "attendance_percentage", header: "Attendance %", render: row => pct(row.attendance_percentage) }];
const strengthColumns: DataTableColumn<StrengthRow>[] = [
  { key: "class_name", header: "Class", search: row => row.class_name }, { key: "division", header: "Division", render: row => row.division || "All divisions" },
  numberColumn("total", "Total"), numberColumn("active", "Active"), numberColumn("inactive", "Inactive"), numberColumn("new_admissions", "Admissions in period"),
  { key: "attendance_percentage", header: "Attendance %", render: row => pct(row.attendance_percentage) }, { key: "pending", header: "Pending dues", render: row => money(row.pending) },
];
const examColumns: DataTableColumn<ExamSummaryRow>[] = [
  { key: "title", header: "Exam", search: row => row.title }, { key: "subject", header: "Subject", search: row => row.subject }, { key: "date", header: "Date", render: row => date(row.date) },
  numberColumn("records", "Records"), numberColumn("graded", "Graded"), numberColumn("passed", "Passed"), numberColumn("absent", "Absent"),
  { key: "average_percentage", header: "Weighted marks %", render: row => pct(row.average_percentage) }, { key: "pass_percentage", header: "Pass %", render: row => pct(row.pass_percentage) },
];
const resultColumns: DataTableColumn<StudentResultRow>[] = [
  { key: "student_name", header: "Student", search: row => [row.student_name, row.gr_no] }, { key: "exam", header: "Exam", search: row => row.exam },
  { key: "subject", header: "Subject", search: row => row.subject }, { key: "date", header: "Date", render: row => date(row.date) },
  { key: "marks", header: "Marks", render: row => `${row.marks_obtained ?? "—"} / ${row.max_marks}` },
  { key: "percentage", header: "%", render: row => pct(row.percentage) }, { key: "outcome", header: "Outcome", search: row => row.outcome },
  { key: "grade", header: "Grade", search: row => row.grade }, { key: "status", header: "Review status", search: row => row.status },
];
const detailFeeColumns: DataTableColumn<StudentFeeRow>[] = [
  { key: "fee_type", header: "Fee", search: row => row.fee_type }, { key: "academic_year", header: "Year", search: row => row.academic_year },
  { key: "due_date", header: "Due date", render: row => date(row.due_date) }, { key: "status", header: "Status", search: row => row.status },
  ...([['payable', 'Payable'], ['credited_paid', 'Paid'], ['pending', 'Pending'], ['govt_pending', 'Government pending']] as const).map(([key, header]) => ({ key, header, render: (row: StudentFeeRow) => money(row[key]) })),
];
const dailyColumns: DataTableColumn<AttendanceReportRow>[] = [{ key: "date", header: "Date", render: row => date(row.date) }, numberColumn("present", "Present"), numberColumn("absent", "Absent"), numberColumn("unmarked", "Unmarked"), { key: "percentage", header: "Attendance %", render: row => pct(row.percentage) }];

function BarChart({ title, data, onSelect, format = String }: { title: string; data: { label: string; value: number; id?: string }[]; onSelect?: (id: string) => void; format?: (value: number) => string }) {
  const maximum = Math.max(1, ...data.map(row => row.value));
  return <figure className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5"><figcaption className="mb-4 font-semibold text-slate-900">{title}</figcaption><div className="max-h-72 space-y-3 overflow-y-auto">{data.length ? data.map((row, index) => <button key={`${row.label}-${index}`} type="button" disabled={!onSelect || !row.id} onClick={() => row.id && onSelect?.(row.id)} title={`${row.label}: ${format(row.value)}`} className="block w-full text-left disabled:cursor-default"><div className="mb-1 flex justify-between gap-3 text-xs"><span className="truncate">{row.label}</span><strong>{format(row.value)}</strong></div><div className="h-3 rounded-full bg-slate-100"><div className={`h-3 rounded-full ${index % 3 === 0 ? "bg-teal-600" : index % 3 === 1 ? "bg-indigo-500" : "bg-amber-500"}`} style={{ width: `${Math.max(0, row.value) / maximum * 100}%` }} /></div></button>) : <p className="text-sm text-slate-500">No recorded data for this selection.</p>}</div></figure>;
}

const defaults = { academic_year: "", school_class: "", division: "", student_status: "", search: "", from_date: "", to_date: "" };
type Tab = "overview" | "students" | "strength" | "attendance" | "fees" | "results" | "exits" | "demographics" | "trends";
const tabs: { value: Tab; label: string }[] = [{ value: "overview", label: "Overview & charts" }, { value: "students", label: "Student directory" }, { value: "strength", label: "Class / division strength" }, { value: "attendance", label: "Attendance" }, { value: "fees", label: "Fees & dues" }, { value: "results", label: "Academic & exams" }, { value: "exits", label: "Transfers / dropouts" }, { value: "demographics", label: "Gender / category" }, { value: "trends", label: "Year-wise trends" }];

export default function TrusteeStudentReportPage() {
  const [draft, setDraft] = useState(defaults);
  const [applied, setApplied] = useState(defaults);
  const [report, setReport] = useState<StudentReport | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<StudentReport | null>(null);
  const [detailError, setDetailError] = useState("");
  const load = useCallback(async (signal: AbortSignal) => {
    setLoading(true); setError("");
    try { const data = await getStudentReport({ ...applied, page: String(page), page_size: String(pageSize) }, signal); if (!signal.aborted) setReport(data); }
    catch (error) { if (!signal.aborted) { setReport(null); setError(error instanceof Error ? error.message : "Unable to load report."); } }
    finally { if (!signal.aborted) setLoading(false); }
  }, [applied, page, pageSize]);
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load, refresh]);
  useEffect(() => {
    if (selectedId === null) return;
    const controller = new AbortController();
    getStudentReport({ academic_year: applied.academic_year, from_date: applied.from_date, to_date: applied.to_date, student: String(selectedId), export_all: "true" }, controller.signal)
      .then(data => { if (!controller.signal.aborted) setDetail(data); })
      .catch(error => { if (!controller.signal.aborted) setDetailError(error instanceof Error ? error.message : "Unable to load student details."); });
    return () => controller.abort();
  }, [selectedId, applied.academic_year, applied.from_date, applied.to_date]);
  function apply(filters = draft) { setPage(1); setApplied({ ...filters }); }
  function chartFilter(key: "school_class" | "academic_year", value: string) { const filters = { ...applied, [key]: value, division: "" }; setDraft(filters); apply(filters); }
  async function exportReport(format: "pdf" | "excel") {
    setExporting(true); setError("");
    try {
      const all = await getStudentReport({ ...applied, export_all: "true" });
      const context = { ...applied, academic_year: report?.options.academic_years.find(year => String(year.id) === applied.academic_year)?.name || applied.academic_year, school_class: report?.options.classes.find(item => String(item.id) === applied.school_class)?.name || applied.school_class };
      const exports = await import("@/lib/student-report-export");
      if (format === "pdf") await exports.exportStudentPdf(all, context); else await exports.exportStudentExcel(all, context);
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to export report."); }
    finally { setExporting(false); }
  }
  const summary = report?.summary;
  const currentStudent = detail?.students.results[0];
  const control = "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm";
  const common = { createdDate: false, loading, error };
  const studentTable = { ...common, data: report?.students.results || [], getRowId: (row: StudentReportRow) => row.id, manualPagination: true, manualFiltering: true, totalCount: report?.students.count || 0, page, pageSize, onPageChange: setPage, onPageSizeChange: (size: number) => { setPage(1); setPageSize(size); }, renderActions: (row: StudentReportRow) => <Button size="sm" variant="outline" disabled={loading} onClick={() => { setDetail(null); setDetailError(""); setSelectedId(row.id); }}><Eye className="mr-1 h-4 w-4" />Details</Button> };
  return <div className="mx-auto max-w-[1600px] space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 p-6 text-white"><div><p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-100"><GraduationCap className="h-4 w-4" />Read-only Trustee oversight</p><h1 className="text-2xl font-bold">Student Management & Reports</h1><p className="mt-2 text-sm text-teal-100">Enrollment, attendance, fees and academic performance for {report?.school || "your school"}.</p></div><Button variant="outline" disabled={loading || exporting} onClick={() => setRefresh(value => value + 1)} className="bg-white text-teal-900"><RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh</Button></div>
    <form onSubmit={event => { event.preventDefault(); apply(); }} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-2 xl:grid-cols-4">
      <label className="space-y-1 text-xs font-medium">Academic year<select className={control} value={draft.academic_year} onChange={event => setDraft({ ...draft, academic_year: event.target.value })}><option value="">All recorded years</option>{report?.options.academic_years.map(year => <option key={year.id} value={year.id}>{year.name}</option>)}</select></label>
      <label className="space-y-1 text-xs font-medium">Class<select className={control} value={draft.school_class} onChange={event => setDraft({ ...draft, school_class: event.target.value, division: "" })}><option value="">All classes</option>{report?.options.classes.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="space-y-1 text-xs font-medium">Division<select className={control} value={draft.division} onChange={event => setDraft({ ...draft, division: event.target.value })}><option value="">All divisions</option>{Array.from(new Set(report?.options.divisions.filter(item => !draft.school_class || String(item.SchoolClass_id) === draft.school_class).map(item => item.division).filter((value): value is string => !!value))).map(division => <option key={division} value={division}>{division}</option>)}</select></label>
      <label className="space-y-1 text-xs font-medium">Student status<select className={control} value={draft.student_status} onChange={event => setDraft({ ...draft, student_status: event.target.value })}><option value="">All students</option>{["active", "inactive", "transferred", "dropout", "left_unspecified"].map(status => <option key={status} value={status}>{human(status)}</option>)}</select></label>
      <label className="space-y-1 text-xs font-medium sm:col-span-2">Search student<input className={control} value={draft.search} onChange={event => setDraft({ ...draft, search: event.target.value })} placeholder="Name, GR, roll number or mobile" /></label>
      <label className="space-y-1 text-xs font-medium">Activity from<DatePicker className="w-full" value={draft.from_date} onChange={date => setDraft({ ...draft, from_date: date })} disableFuture={true} /></label>
      <label className="space-y-1 text-xs font-medium">Activity to<DatePicker className="w-full" value={draft.to_date} onChange={date => setDraft({ ...draft, to_date: date })} min={draft.from_date || undefined} disableFuture={true} /></label>
      <div className="flex gap-2"><Button type="submit" disabled={loading || exporting}>Apply filters</Button><Button variant="outline" type="button" disabled={loading || exporting} onClick={() => { setDraft(defaults); apply(defaults); }}>Reset</Button></div>
    </form>
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</p>}
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-slate-600">Activity dates: {report?.from_date ? date(report.from_date) : "All recorded history"} to {report ? date(report.to_date) : "today"}. Fee dues and student status are current.</p><div className="flex gap-2"><Button variant="outline" disabled={loading || exporting || !report} onClick={() => exportReport("pdf")}><Download className="mr-2 h-4 w-4" />{exporting ? "Preparing…" : "PDF"}</Button><Button variant="outline" disabled={loading || exporting || !report} onClick={() => exportReport("excel")}><Download className="mr-2 h-4 w-4" />Excel</Button></div></div>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[
      ["Total students", summary?.total_students], ["Active / inactive", summary ? `${summary.active} / ${summary.inactive}` : "—"], ["Admissions in selected period", summary?.new_admissions], ["Recorded transfers / dropouts", summary ? `${summary.transferred} / ${summary.dropouts}` : "—"],
      ["Marked attendance", summary ? pct(summary.attendance_percentage) : "—"], ["Student receipts in period", summary ? money(summary.student_collection) : "—"], ["Pending student dues", summary ? money(summary.pending) : "—"], ["Published final average", summary ? pct(summary.published_final_average) : "—"],
    ].map(([label, value]) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-xl font-bold">{loading ? "—" : value ?? "—"}</p></div>)}</div>
    {summary && <p className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900">Data coverage: {summary.students_without_attendance} students without marked attendance · {summary.published_final_students} with published final results · {summary.gender_missing} missing gender · {summary.category_missing} missing category · {summary.left_unspecified} leaving records without an exit reason. No recorded transfers/dropouts means none were explicitly recorded.</p>}
    <div className="flex flex-wrap gap-2">{tabs.map(item => <Button key={item.value} variant={tab === item.value ? "default" : "outline"} onClick={() => setTab(item.value)}>{item.label}</Button>)}</div>
    {tab === "overview" && <div className="grid gap-5 xl:grid-cols-2">
      <BarChart title="Class strength — click to filter" data={report?.class_strength.map(row => ({ label: row.class_name, value: row.total, id: row.class_id ? String(row.class_id) : undefined })) || []} onSelect={id => chartFilter("school_class", id)} />
      <BarChart title="Recorded academic-year participation — click a year" data={report?.enrollment_trends.map(row => ({ label: row.year, value: row.recorded_students, id: String(row.id) })) || []} onSelect={id => chartFilter("academic_year", id)} />
      <BarChart title="Gender statistics" data={report?.gender.map(row => ({ label: row.label, value: row.count })) || []} />
      <BarChart title="Category statistics" data={report?.categories.map(row => ({ label: row.label, value: row.count })) || []} />
      <BarChart title="Exam performance (verified / published marks)" data={report?.exams.filter(row => row.average_percentage !== null).map(row => ({ label: `${row.title} · ${row.subject || "All subjects"}`, value: row.average_percentage! })) || []} format={value => `${value.toFixed(2)}%`} />
      <BarChart title="Student fee receipts by month" data={report?.collections.map(row => ({ label: row.month, value: Number(row.student_collection) })) || []} format={money} />
    </div>}
    {tab === "students" && <DataTable {...studentTable} columns={studentColumns} minWidth={1500} caption="Student directory — use the search and filters above; Details opens read-only records" />}
    {tab === "strength" && <div className="space-y-5"><DataTable {...common} data={report?.class_strength || []} columns={strengthColumns} getRowId={row => row.id} caption="Class-wise strength" /><DataTable {...common} data={report?.division_strength || []} columns={strengthColumns} getRowId={row => row.id} caption="Class and division-wise strength" /></div>}
    {tab === "attendance" && <div className="space-y-5"><DataTable {...studentTable} columns={attendanceColumns} caption="Student attendance — only marked records enter the percentage" /><BarChart title="Daily marked attendance" data={report?.attendance.filter(row => row.percentage !== null).map(row => ({ label: date(row.date), value: row.percentage! })) || []} format={value => `${value.toFixed(2)}%`} /><DataTable {...common} data={report?.attendance || []} columns={dailyColumns} getRowId={row => row.date} caption="Date-wise attendance records" /></div>}
    {tab === "fees" && <div className="space-y-5">{summary && <p className="rounded-xl bg-teal-50 p-4 text-sm text-teal-900">Net payable {money(summary.payable)} · Credited paid {money(summary.credited_paid)} · Overdue student dues {money(summary.overdue_due)} · Government receipts {money(summary.government_collection)} · Government pending {money(summary.govt_pending)}</p>}<DataTable {...studentTable} columns={feeColumns} minWidth={1600} caption="Student-wise fee collection and pending dues; cancelled fees excluded" /><DataTable {...common} data={report?.collections || []} columns={[{ key: "month", header: "Month", search: row => row.month }, { key: "student_collection", header: "Student receipts", render: row => money(row.student_collection) }, { key: "government_collection", header: "Government receipts", render: row => money(row.government_collection) }]} getRowId={row => row.month} caption="Monthly accepted receipts" /></div>}
    {tab === "results" && <div className="space-y-5"><DataTable {...common} data={report?.exams || []} columns={examColumns} getRowId={row => row.id} caption="Examination summary — verified/published marks only" /><DataTable {...studentTable} columns={[...identity, { key: "exam_percentage", header: "Weighted exam %", render: row => pct(row.exam_percentage) }, numberColumn("graded_results", "Graded result entries"), { key: "final_percentage", header: "Published final %", render: row => pct(row.final_percentage) }, { key: "final_grade", header: "Grade", render: row => row.final_grade || "—" }, { key: "final_year", header: "Final result year", render: row => row.final_year || "—" }]} caption="Student academic performance — open Details for subject/exam records" /><DataTable {...common} data={report?.result_records || []} columns={resultColumns} getRowId={row => row.id} search caption={`Latest ${report?.result_records.length || 0} of ${report?.result_record_count || 0} result entries. PDF/Excel includes every matching entry; Details shows all entries for one student.`} /></div>}
    {tab === "exits" && <div className="space-y-5"><BarChart title="Recorded lifecycle status" data={report?.status.map(row => ({ label: human(row.label), value: row.count })) || []} /><p className="text-sm text-slate-600">Select Transferred, Dropout or Left unspecified in Student status above to inspect the relevant student records. Exit reasons must be explicitly recorded in student fields.</p><DataTable {...studentTable} columns={[...identity, { key: "student_status", header: "Recorded status", render: row => human(row.student_status) }, { key: "leaving_date", header: "Leaving date", render: row => date(row.leaving_date) }, { key: "pending", header: "Pending dues", render: row => money(row.pending) }]} caption="Lifecycle records for the selected student cohort" /></div>}
    {tab === "demographics" && <div className="grid gap-5 xl:grid-cols-2">{[{ title: "Gender", rows: report?.gender || [] }, { title: "Category", rows: report?.categories || [] }].map(section => <div key={section.title} className="space-y-4"><BarChart title={`${section.title} statistics`} data={section.rows.map(row => ({ label: row.label, value: row.count }))} /><DataTable {...common} data={section.rows} columns={[{ key: "label", header: section.title, search: row => row.label }, numberColumn("count", "Students")]} getRowId={row => row.label} /></div>)}</div>}
    {tab === "trends" && <div className="space-y-5"><BarChart title="Recorded participation across academic years" data={report?.enrollment_trends.map(row => ({ label: row.year, value: row.recorded_students, id: String(row.id) })) || []} onSelect={id => chartFilter("academic_year", id)} /><DataTable {...common} data={report?.enrollment_trends || []} columns={[{ key: "year", header: "Academic year", search: row => row.year }, numberColumn("recorded_students", "Recorded students")]} getRowId={row => row.id} caption="Participation from current placement, admission year and final-result history; not a complete historical enrollment register" /><DataTable {...common} data={report?.admission_trends || []} columns={[{ key: "year", header: "Admission calendar year", search: row => row.year }, numberColumn("count", "Admissions")]} getRowId={row => row.year} caption="First-admission dates for the selected student cohort" /></div>}
    <details className="rounded-xl border border-slate-200 bg-white p-5"><summary className="cursor-pointer font-semibold">Report definitions & data coverage</summary><ul className="mt-3 list-disc space-y-2 pl-5 text-xs leading-relaxed text-slate-600">{report?.notes.map(note => <li key={note}>{note}</li>)}</ul><p className="mt-3 text-xs text-slate-500">PDF and Excel export every matching student, fee and result record across all pages. All views are read-only.</p></details>
    <Dialog open={selectedId !== null} onOpenChange={open => { if (!open) setSelectedId(null); }}><DialogContent className="sm:max-w-6xl"><DialogTitle>{currentStudent?.name || "Student details"}</DialogTitle><DialogDescription>Read-only student profile, fee ledger and examination records for the selected year and activity dates.</DialogDescription>{detailError && <p role="alert" className="text-red-700">{detailError}</p>}{!detail && !detailError && <p>Loading student details…</p>}{detail && !currentStudent && <p>No student record matches this academic-year selection.</p>}{currentStudent && <><dl className="grid grid-cols-2 gap-4 text-sm lg:grid-cols-4">{Object.entries(currentStudent).filter(([key]) => !["id", "class_id"].includes(key)).map(([key, value]) => <div key={key}><dt className="text-xs text-slate-500">{human(key)}</dt><dd className="mt-1 break-words font-medium">{value === null ? "Not recorded" : typeof value === "boolean" ? value ? "Yes" : "No" : String(value)}</dd></div>)}</dl><DataTable data={detail?.fee_records || []} columns={detailFeeColumns} getRowId={row => row.id} createdDate={false} caption="Student fee ledger" /><DataTable data={detail?.result_records || []} columns={resultColumns} getRowId={row => row.id} createdDate={false} caption="Student exam results" /><DataTable data={detail?.attendance || []} columns={dailyColumns} getRowId={row => row.date} createdDate={false} caption="Student attendance dates" /></>}</DialogContent></Dialog>
  </div>;
}
