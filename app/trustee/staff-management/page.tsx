"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Download, Eye, Printer, RefreshCw, UserPlus, Users } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { getStaffReport, type StaffReport, type StaffReportRow } from "@/lib/trustee-staff-report";

const human = (key: string) => key.replaceAll("_", " ");
const value = (v: unknown) => v === null || v === undefined ? "Not available" : typeof v === "boolean" ? v ? "Yes" : "No" : String(v);
const currency = (v: unknown) => v === null || v === undefined ? "Restricted / unavailable" : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(v));
const percentage = (v: unknown) => v === null || v === undefined ? "Not available" : `${Number(v).toFixed(2)}%`;
const columns = (keys: string[]): DataTableColumn<StaffReportRow>[] => keys.map(key => ({ key, header: human(key), search: row => value(row[key]), render: row => key.includes("percentage") || key === "profile_completion" ? percentage(row[key]) : value(row[key]), camelCase: false }));
const identity = ["id", "name", "department", "designation", "category", "status"];
const defaults = { academic_year: "", from_date: "", to_date: "", department: "", designation: "", category: "", employment_status: "", staff: "", search: "", ordering: "name" };
type Filters = typeof defaults;
const sections = ["Staff Overview", "Staff Distribution", "Attendance Reports", "Leave Reports", "Salary & Payroll", "Employment Reports", "Qualifications & Experience", "Performance Reports", "Documents & Compliance", "Recruitment & Vacancies", "Staff-Wise Reports"];

function ReportTable({ title, rows, keys, count }: { title: string; rows: StaffReportRow[]; keys?: string[]; count?: number }) {
  const [ordering, setOrdering] = useState("");
  const tableKeys = keys || (rows[0] ? Object.keys(rows[0]) : []);
  const sorted = useMemo(() => [...rows].sort((a, b) => {
    if (!ordering) return 0;
    const key = ordering.replace(/^-/, "");
    const direction = ordering.startsWith("-") ? -1 : 1;
    const first = a[key], second = b[key];
    if (typeof first === "number" && typeof second === "number") return (first - second) * direction;
    return value(first).localeCompare(value(second), undefined, { numeric: true }) * direction;
  }), [rows, ordering]);
  return <div className="rounded-2xl border border-slate-200 bg-white p-4"><DataTable data={sorted} columns={columns(tableKeys)} getRowId={(row, index) => String(row.id ?? `${row.staff_id ?? "row"}-${index}`)} createdDate={false} search caption={`${title}${count !== undefined && count > rows.length ? ` — showing ${rows.length} of ${count}; exports include all records` : ""}`}
    emptyTitle="No recorded data for this selection" emptyDescription="Try another date range or filter. Data that is not maintained is listed in the relevant section."
    toolbarExtra={<label className="text-xs">Sort <select aria-label={`Sort ${title}`} value={ordering} onChange={event => setOrdering(event.target.value)} className="ml-2 rounded-lg border p-2"><option value="">Default order</option>{tableKeys.flatMap(key => [<option key={key} value={key}>{human(key)} ↑</option>, <option key={`-${key}`} value={`-${key}`}>{human(key)} ↓</option>])}</select></label>} /></div>;
}

function Chart({ title, rows, label = "label", metric = "count", onSelect, percent = false }: { title: string; rows: StaffReportRow[]; label?: string; metric?: string; onSelect?: (label: string) => void; percent?: boolean }) {
  const data = rows.filter(row => row[metric] !== null && row[metric] !== undefined);
  const maximum = Math.max(1, ...data.map(row => Number(row[metric])));
  return <figure className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5"><figcaption className="mb-4 font-semibold">{title}</figcaption><div className="max-h-80 space-y-3 overflow-y-auto">{data.length ? data.map((row, index) => <button key={`${row[label]}-${index}`} type="button" disabled={!onSelect} onClick={() => onSelect?.(String(row[label]))} className="block w-full text-left disabled:cursor-default" title={`${value(row[label])}: ${value(row[metric])}`}><div className="mb-1 flex justify-between gap-4 text-xs"><span className="truncate">{value(row[label])}</span><strong>{percent ? percentage(row[metric]) : Number(row[metric]).toLocaleString("en-IN")}</strong></div><div className="h-3 rounded-full bg-slate-100"><div className={`h-3 rounded-full ${index % 3 === 0 ? "bg-teal-600" : index % 3 === 1 ? "bg-indigo-500" : "bg-amber-500"}`} style={{ width: `${Math.max(0, Number(row[metric])) / maximum * 100}%` }} /></div></button>) : <p className="text-sm text-slate-500">No recorded data for this selection.</p>}</div></figure>;
}

function Unavailable({ text }: { text?: string }) {
  return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-relaxed text-amber-900"><p className="mb-1 font-semibold">Source data not maintained</p><p>{text || "This information is unavailable in the current staff records."}</p></div>;
}

export default function TrusteeStaffManagementPage() {
  const [draft, setDraft] = useState<Filters>(defaults);
  const [applied, setApplied] = useState<Filters>(defaults);
  const [report, setReport] = useState<StaffReport | null>(null);
  const [section, setSection] = useState(0);
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly" | "yearly">("monthly");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<StaffReport | null>(null);
  const [detailError, setDetailError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    getStaffReport({ ...applied, page: String(page), page_size: String(pageSize) }, controller.signal)
      .then(data => { if (!controller.signal.aborted) setReport(data); })
      .catch(error => { if (!controller.signal.aborted) { setReport(null); setError(error instanceof Error ? error.message : "Unable to load staff reports."); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [applied, page, pageSize, refresh]);
  useEffect(() => {
    if (selected === null) return;
    const controller = new AbortController();
    getStaffReport({ ...applied, staff: selected, search: "", page: "1", export_all: "true" }, controller.signal)
      .then(data => { if (!controller.signal.aborted) setDetail(data); })
      .catch(error => { if (!controller.signal.aborted) setDetailError(error instanceof Error ? error.message : "Unable to load details."); });
    return () => controller.abort();
  }, [selected, applied]);
  function apply(filters = draft) { setPage(1); setApplied({ ...filters }); }
  async function exportReport(format: "excel" | "pdf" | "print") {
    setExporting(true); setError("");
    try {
      const all = await getStaffReport({ ...applied, export_all: "true" });
      const context = { ...applied, academic_year: report?.options.academic_years.find(y => String(y.id) === applied.academic_year)?.name || applied.academic_year,
        department: report?.options.departments.find(d => String(d.id) === applied.department)?.name || applied.department,
        staff: report?.options.staff.find(s => String(s.id) === applied.staff)?.name || applied.staff };
      const exporter = await import("@/lib/staff-report-export");
      await exporter.exportStaffReport(all, context, format);
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to export report."); }
    finally { setExporting(false); }
  }
  const s = report?.summary;
  const control = "mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm";
  const staffColumns = columns(section === 2 ? [...identity, "present", "absent", "late", "half_day", "leave", "holiday", "week_off", "missing_punch", "early_departure", "attendance_percentage"]
    : section === 3 ? [...identity, "leave_applications", "approved_leaves", "pending_leaves", "rejected_leaves", "approved_leave_days"]
    : section === 4 ? [...identity, "base_salary", "payroll_gross", "payroll_deductions", "payroll_net", "payroll_paid", "payroll_pending"]
    : section === 5 ? [...identity, "joining_date", "exit_date", "service_years", "created_at"]
    : section === 6 ? [...identity, "subjects", "service_years", "qualification_status"]
    : section === 8 ? [...identity, "profile_completion", "missing_profile_fields", "document_status"]
    : [...identity, "joining_date", "service_years", "attendance_percentage", "leave_applications", ...(report?.permissions.salary ? ["payroll_net", "payroll_pending"] : []), "qualification_status", "document_status", ...(report?.permissions.contacts ? ["email", "mobile"] : [])]);
  const directory = <DataTable data={report?.staff.results || []} columns={staffColumns} getRowId={row => String(row.id)} createdDate={false} loading={loading} error={error}
    manualFiltering manualPagination page={page} pageSize={pageSize} totalCount={report?.staff.count || 0} onPageChange={setPage} onPageSizeChange={size => { setPage(1); setPageSize(size); }} minWidth={1300}
    caption="Staff-wise records — global filters, search and sorting apply across all pages" emptyTitle="No staff match the selected filters"
    renderActions={row => <Button variant="outline" size="sm" disabled={loading || exporting} onClick={() => { setDetail(null); setDetailError(""); setSelected(String(row.id)); }}><Eye className="mr-1 h-4 w-4" />View report</Button>} />;
  const detailed = detail?.staff.results[0];
  return <div className="mx-auto max-w-[1600px] space-y-6">
    <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 p-6 text-white">
      <div>
        <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-100">
          <Users className="h-4 w-4" />Trustee · Staff Oversight & Management
        </p>
        <h1 className="text-2xl font-bold">Staff Management Dashboard</h1>
        <p className="mt-2 text-sm text-teal-100">
          People, attendance, leave and authorized payroll reports for {report?.school || "your school"}.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Link href="/trustee/staff">
          <Button className="bg-emerald-400 hover:bg-emerald-300 text-slate-900 font-semibold shadow-md transition-all">
            <UserPlus className="mr-2 h-4 w-4" />+ Add Staff Member
          </Button>
        </Link>
        <Button variant="outline" disabled={loading || exporting} onClick={() => setRefresh(r => r + 1)} className="bg-white text-teal-900">
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh
        </Button>
      </div>
    </header>
    <form onSubmit={event => { event.preventDefault(); apply(); }} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-2 xl:grid-cols-4">
      <label className="text-xs font-medium">Academic year<select className={control} value={draft.academic_year} onChange={event => setDraft({ ...draft, academic_year: event.target.value })}><option value="">Calendar year / selected dates</option>{report?.options.academic_years.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}</select></label>
      <label className="text-xs font-medium">Department<select className={control} value={draft.department} onChange={event => setDraft({ ...draft, department: event.target.value })}><option value="">All departments</option>{report?.options.departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
      <label className="text-xs font-medium">Designation<select className={control} value={draft.designation} onChange={event => setDraft({ ...draft, designation: event.target.value })}><option value="">All designations</option>{report?.options.designations.map(d => <option key={d}>{d}</option>)}</select></label>
      <label className="text-xs font-medium">Staff category<select className={control} value={draft.category} onChange={event => setDraft({ ...draft, category: event.target.value })}><option value="">All categories</option>{report?.options.categories.map(c => <option key={c}>{c}</option>)}</select></label>
      <label className="text-xs font-medium">Employment status<select className={control} value={draft.employment_status} onChange={event => setDraft({ ...draft, employment_status: event.target.value })}><option value="">All statuses</option>{["active", "inactive", "exited", "not_exited"].map(state => <option key={state} value={state}>{human(state)}</option>)}</select></label>
      <label className="text-xs font-medium">Individual staff<select className={control} value={draft.staff} onChange={event => setDraft({ ...draft, staff: event.target.value })}><option value="">All staff</option>{report?.options.staff.map(m => <option key={m.id} value={m.id}>#{m.id} · {m.name}</option>)}</select></label>
      <label className="text-xs font-medium">Activity from<DatePicker className="w-full" value={draft.from_date} onChange={date => setDraft({ ...draft, from_date: date })} disableFuture={true} /></label>
      <label className="text-xs font-medium">Activity to<DatePicker className="w-full" value={draft.to_date} onChange={date => setDraft({ ...draft, to_date: date })} min={draft.from_date || undefined} disableFuture={true} /></label>
      <label className="text-xs font-medium sm:col-span-2">Search staff<input className={control} placeholder="Staff ID, name, designation or category" value={draft.search} onChange={event => setDraft({ ...draft, search: event.target.value })} /></label>
      <label className="text-xs font-medium">Staff sorting<select className={control} value={draft.ordering} onChange={event => setDraft({ ...draft, ordering: event.target.value })}>{["name", "joining_date", "department", "attendance_percentage"].flatMap(key => [<option key={key} value={key}>{human(key)} ↑</option>, <option key={`-${key}`} value={`-${key}`}>{human(key)} ↓</option>])}</select></label>
      <div className="flex items-end gap-2"><Button type="submit" disabled={loading || exporting}>Apply filters</Button><Button type="button" variant="outline" disabled={loading || exporting} onClick={() => { setDraft(defaults); apply(defaults); }}>Reset</Button></div>
    </form>
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</p>}
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-slate-600">Activity: {report?.from_date || "—"} to {report?.to_date || "—"} · Generated: {report?.generated_at || "—"}<br />Salary access: {report?.permissions.salary ? "Granted" : "Restricted"} · Contact access: {report?.permissions.contacts ? "Granted" : "Restricted"}</p><div className="flex flex-wrap gap-2">{(["pdf", "excel", "print"] as const).map(format => <Button key={format} variant="outline" disabled={loading || exporting || !report} onClick={() => exportReport(format)}>{format === "print" ? <Printer className="mr-2 h-4 w-4" /> : <Download className="mr-2 h-4 w-4" />}{exporting ? "Preparing…" : format === "print" ? "Print PDF" : format.toUpperCase()}</Button>)}</div></div>
    <nav aria-label="Staff report sections" className="flex flex-wrap gap-2">{sections.map((label, index) => <Button key={label} variant={section === index ? "default" : "outline"} aria-current={section === index ? "page" : undefined} onClick={() => setSection(index)}>{label}</Button>)}</nav>
    {loading && <p role="status" className="rounded-xl bg-teal-50 p-4 text-teal-900">Loading staff reports…</p>}
    {!loading && report && <>
      {section === 0 && <><div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[
        ["Total staff", s?.total_staff], ["Active staff", s?.active_staff], ["Inactive staff", s?.inactive_staff], ["Newly joined in period", s?.newly_joined], ["Recorded exits in period", s?.recorded_exits],
        ["Resigned staff", s?.resigned], ["Retired staff", s?.retired], ["Staff on probation", s?.probation], ["Contract-based staff", s?.contract_based], ["Attendance", percentage(s?.attendance_percentage)],
        ["Leave applications", s?.leave_applications], ["Payroll net in period", currency(s?.payroll_net)],
      ].map(([label, metric]) => <div key={String(label)} className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-xl font-bold text-slate-900">{metric === null ? "Not maintained" : value(metric)}</p></div>)}</div><p className="rounded-xl bg-amber-50 p-4 text-xs text-amber-900">Coverage: {value(s?.without_attendance)} staff without reportable attendance. Unavailable employment fields are not counted as zero. Status is current; activity metrics follow selected dates.</p><div className="grid gap-5 xl:grid-cols-2"><Chart title="Department-wise staff — click to filter" rows={report.distribution.department} onSelect={label => { const d = report.options.departments.find(item => item.name === label); if (d) { const next = { ...applied, department: String(d.id) }; setDraft(next); apply(next); } }} /><Chart title="Recorded staff strength" rows={report.strength_trends} label="month" metric="recorded_strength" /><Chart title="Attendance percentage trend" rows={report.attendance.monthly} label="period" metric="percentage" percent /><Chart title="Approved leave utilization" rows={report.leave_trends} label="month" metric="approved_days" /></div></>}
      {section === 1 && <><div className="grid gap-5 xl:grid-cols-2">{Object.entries(report.distribution).map(([key, rows]) => <div key={key} className="space-y-4"><Chart title={`${human(key)} distribution`} rows={rows} /><ReportTable title={`${human(key)} distribution`} rows={rows} /></div>)}</div><Unavailable text={report.unavailable.qualifications} /></>}
      {section === 2 && <><div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{["attendance_percentage", "missing_punch", "late_arrivals", "early_departures"].map(key => <div key={key} className="rounded-xl border bg-white p-4"><p className="text-xs text-slate-500">{human(key)}</p><p className="mt-2 text-xl font-bold">{key.includes("percentage") ? percentage(s?.[key]) : value(s?.[key])}</p></div>)}</div><label className="block max-w-xs text-sm">Period grouping<select className={control} value={period} onChange={event => setPeriod(event.target.value as typeof period)}>{["daily", "weekly", "monthly", "yearly"].map(p => <option key={p}>{p}</option>)}</select></label><Chart title={`${human(period)} attendance percentage`} rows={report.attendance[period]} label="period" metric="percentage" percent /><ReportTable title={`${human(period)} attendance counts`} rows={report.attendance[period]} />{directory}<ReportTable title="Attendance history, missing punches, late and early departures" rows={report.attendance_records} count={report.attendance_record_count} /><ReportTable title="Recorded absence frequency — ranked by absent days, then leave days" rows={report.frequent_absence} /></>}
      {section === 3 && <><div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{["leave_applications", "approved_leaves", "pending_leaves", "rejected_leaves"].map(key => <div key={key} className="rounded-xl border bg-white p-4"><p className="text-xs text-slate-500">{human(key)}</p><p className="mt-2 text-xl font-bold">{value(s?.[key])}</p></div>)}</div><Chart title="Approved leave days by month" rows={report.leave_trends} label="month" metric="approved_days" /><ReportTable title="Leave type summary" rows={report.leave_types} /><ReportTable title="Department leave summary" rows={report.leave_departments} />{directory}<ReportTable title="Leave application history" rows={report.leave_records} count={report.leave_record_count} /><ReportTable title="Current balances for overlapping leave cycles" rows={report.leave_balances} count={report.leave_balance_count} /><ReportTable title="Absence frequency" rows={report.frequent_absence} /></>}
      {section === 4 && (report.permissions.salary ? <><div className="grid grid-cols-2 gap-4 lg:grid-cols-5">{["gross", "deductions", "net", "paid", "pending"].map(key => <div key={key} className="rounded-xl border bg-white p-4"><p className="text-xs text-slate-500">{human(key)} in period</p><p className="mt-2 text-xl font-bold">{currency(s?.[`payroll_${key}`])}</p></div>)}</div><Chart title="Monthly net payroll expenses (INR)" rows={report.payroll_months} label="month" metric="net" />{directory}<ReportTable title="Month-wise payroll" rows={report.payroll_months} /><ReportTable title="Year-wise payroll" rows={report.payroll_years} /><ReportTable title="Department payroll" rows={report.payroll_departments} /><ReportTable title="Salary payment / payslip history" rows={report.payroll_records} count={report.payroll_record_count} /><ReportTable title="Saved allowance, deduction and overtime components (where recorded)" rows={report.payroll_components} count={report.payroll_component_count} /></> : <Unavailable text="Salary reports require an explicit assigned salary permission. Salary amounts and components are omitted by the backend and excluded from exports." />)}
      {section === 5 && <><Unavailable text={report.unavailable.employment} /><p className="rounded-xl bg-teal-50 p-4 text-sm text-teal-900">Recorded cohort turnover: {percentage(s?.turnover_percentage)}. An exit date does not identify resignation, retirement or termination.</p>{directory}<div className="grid gap-5 xl:grid-cols-2"><Chart title="Recorded strength by month" rows={report.strength_trends} label="month" metric="recorded_strength" /><Chart title="Recorded turnover rate by month" rows={report.strength_trends} label="month" metric="turnover_percentage" percent /></div><ReportTable title="Joining, exit and strength trends" rows={report.strength_trends} /></>}
      {section === 6 && <><Unavailable text={report.unavailable.qualifications} /><p className="text-sm text-slate-600">Service years reflect recorded tenure only. Subject allocations are current timetable assignments.</p>{directory}<ReportTable title="Distinct teachers per subject" rows={report.distribution.subjects} /></>}
      {section === 7 && <Unavailable text={report.unavailable.performance} />}
      {section === 8 && <><Unavailable text={report.unavailable.documents} /><p className="rounded-xl bg-teal-50 p-4 text-sm text-teal-900">Average basic profile completion: {percentage(s?.profile_completion_average)}. This measures five maintained profile fields, not document verification.</p>{directory}</>}
      {section === 9 && <><Unavailable text={report.unavailable.recruitment} /><p className="text-sm text-slate-600">Recorded joining dates provide new appointment counts. Approved/vacant positions and pipeline charts remain unavailable.</p><Chart title="Recorded new appointments" rows={report.strength_trends} label="month" metric="joined" /><ReportTable title="Recorded appointments by month" rows={report.strength_trends} keys={["month", "joined"]} /></>}
      {section === 10 && directory}
      <details className="rounded-xl border bg-white p-5"><summary className="cursor-pointer font-semibold">Definitions, source coverage & permissions</summary><ul className="mt-3 list-disc space-y-2 pl-5 text-xs leading-relaxed text-slate-600">{report.notes.map(note => <li key={note}>{note}</li>)}</ul></details>
    </>}
    <Dialog open={selected !== null} onOpenChange={open => { if (!open) setSelected(null); }}><DialogContent className="sm:max-w-6xl"><DialogTitle>{value(detailed?.name || "Staff detailed report")}</DialogTitle><DialogDescription>Read-only profile and history for the selected activity dates. Confidential fields follow your assigned permissions.</DialogDescription>{detailError && <p role="alert" className="text-red-700">{detailError}</p>}{!detail && !detailError && <p>Loading staff history…</p>}{detail && !detailed && <p>No staff match these filters.</p>}{detailed && <><dl className="grid grid-cols-2 gap-4 text-sm lg:grid-cols-4">{Object.entries(detailed).map(([key, v]) => <div key={key}><dt className="text-xs text-slate-500">{human(key)}</dt><dd className="mt-1 break-words font-medium">{value(v)}</dd></div>)}</dl><ReportTable title="Complete attendance history in period" rows={detail?.attendance_records || []} /><ReportTable title="Leave history" rows={detail?.leave_records || []} /><ReportTable title="Leave balance snapshots" rows={detail?.leave_balances || []} />{detail?.permissions.salary && <><ReportTable title="Salary history" rows={detail.payroll_records} /><ReportTable title="Salary components" rows={detail.payroll_components} /></>}</>}</DialogContent></Dialog>
  </div>;
}
