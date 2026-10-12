"use client";

import { useCallback, useEffect, useState } from "react";
import { BookOpen, Download, RefreshCw } from "lucide-react";
import { DataTable, dynamicOptions, type DataTableColumn } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { getTrusteeLibraryReport, type TrusteeLibraryReport, type LibraryStockRow, type LibraryCopyRow, type LibraryLoanRow, type LibraryBorrowerRow, type LibraryDailyRow } from "@/lib/trustee-library-report";

const money = (value: string | number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(value));
const date = (value: string | null) => value ? new Date(value).toLocaleDateString("en-GB") : "—";
const numberColumn = <T,>(key: keyof T & string, header: string): DataTableColumn<T> => ({ key, header, numeric: true, render: row => String(row[key]) });
const stockColumns: DataTableColumn<LibraryStockRow>[] = [
  { key: "title", header: "Book", search: row => [row.title, row.isbn, row.author], render: row => <div><p className="font-semibold">{row.title}</p><p className="text-xs text-slate-500">{row.author} · ISBN {row.isbn || "—"}</p></div> },
  { key: "category", header: "Category", search: row => row.category },
  { key: "publisher", header: "Publisher", search: row => row.publisher },
  { key: "location", header: "Rack / shelf", render: row => `${row.rack || "—"} / ${row.shelf || "—"}` },
  numberColumn("catalogue_copies", "Catalogue copies"), numberColumn("registered_copies", "Accession copies"),
  numberColumn("untracked_copies", "Without accession"), numberColumn("catalogue_available", "Catalogue available"),
  numberColumn("available", "Active available copies"), numberColumn("issued", "Active loans"), numberColumn("overdue", "Overdue"),
  numberColumn("lost", "Lost copies"), numberColumn("damaged", "Damaged copies"), numberColumn("under_repair", "Under repair"),
  numberColumn("reserved", "Reserved copies"), numberColumn("disposed", "Disposed"), numberColumn("damaged_condition", "Damage condition"),
  { key: "stock_value", header: "Retained stock value", render: row => money(row.stock_value) },
  { key: "catalogue_value", header: "Catalogue value", render: row => money(row.catalogue_value) },
  numberColumn("times_issued_in_period", "Issues in selected period"),
  { key: "count_mismatch", header: "Copy count check", render: row => row.count_mismatch ? <span className="text-amber-700">Review accession count</span> : "Matched" },
];
const copyColumns: DataTableColumn<LibraryCopyRow>[] = [
  { key: "title", header: "Book", search: row => row.title },
  { key: "accession_no", header: "Accession / barcode", search: row => [row.accession_no, row.barcode], render: row => <div>{row.accession_no}<p className="text-xs text-slate-500">{row.barcode || "—"}</p></div> },
  { key: "status", header: "Status", search: row => row.status }, { key: "condition", header: "Condition", search: row => row.condition },
  { key: "active", header: "Active", render: row => row.is_active ? "Yes" : "No" },
  { key: "purchase_date", header: "Purchased", render: row => date(row.purchase_date) },
  { key: "location", header: "Rack / shelf", render: row => `${row.rack || "—"} / ${row.shelf || "—"}` },
  { key: "value", header: "Recorded / fallback value", render: row => money(row.value) },
];
const loanColumns: DataTableColumn<LibraryLoanRow>[] = [
  { key: "book", header: "Book / accession", render: row => <div><p className="font-semibold">{row.title}</p><p className="text-xs text-slate-500">{row.accession_no || "No accession"} · Loan #{row.id}</p></div> },
  { key: "borrower", header: "Borrower", render: row => <div>{row.borrower_name}<p className="text-xs text-slate-500">{row.borrower_type} #{row.borrower_id} · {row.identifier || "—"}</p></div> },
  { key: "class_role", header: "Class / role", render: row => `${row.class_or_role || "—"} / ${row.division_or_department || "—"}` },
  { key: "issued_date", header: "Issued", render: row => date(row.issued_date) }, { key: "due_date", header: "Due", render: row => date(row.due_date) },
  { key: "returned_date", header: "Returned / closed", render: row => date(row.returned_date) },
  { key: "status", header: "Current loan status", render: row => <span className={row.overdue ? "font-semibold text-rose-700" : ""}>{row.status}{row.overdue && " · OVERDUE"}</span> },
  numberColumn("days_overdue", "Days overdue"), numberColumn("renewals", "Renewals"),
  { key: "estimated_late_fine", header: "Estimated late fine", render: row => money(row.estimated_late_fine) },
  { key: "late_fees", header: "Assessed late fee", render: row => money(row.late_fees) },
  { key: "damage_fees", header: "Damage fee", render: row => money(row.damage_fees) },
  { key: "lost_fees", header: "Lost fee", render: row => money(row.lost_fees) },
  { key: "total_fine", header: "Assessed total", render: row => money(row.total_fine) },
  { key: "condition_on_return", header: "Return condition", render: row => row.condition_on_return || "—" },
  { key: "remarks", header: "Remarks", render: row => row.remarks || "—" },
];
const borrowerColumns: DataTableColumn<LibraryBorrowerRow>[] = [
  { key: "borrower_name", header: "Borrower", search: row => [row.borrower_name, row.identifier, row.borrower_id], render: row => <div className="font-semibold">{row.borrower_name}<p className="text-xs font-normal text-slate-500">ID #{row.borrower_id} · {row.identifier || "—"}</p></div> },
  { key: "class_or_role", header: "Class / role", search: row => row.class_or_role },
  { key: "division_or_department", header: "Division / department", search: row => row.division_or_department },
  numberColumn("total_loans", "Total loans"), numberColumn("active", "Still held"), numberColumn("overdue", "Overdue"),
  numberColumn("returned", "Returned"), numberColumn("lost", "Lost"), numberColumn("damaged", "Damaged"),
  { key: "assessed_fines", header: "Assessed fines", render: row => money(row.assessed_fines) },
];
const dailyColumns: DataTableColumn<LibraryDailyRow>[] = [{ key: "date", header: "Issue date", render: row => date(row.date) }, numberColumn("student_issues", "Student issues"), numberColumn("staff_issues", "Staff issues"), numberColumn("total_issues", "Total issues")];
const defaults = { from_date: "", to_date: "", book: "", category: "", search: "", borrower_type: "", borrower: "", loan_status: "" };
type Tab = "books" | "copies" | "loans" | "students" | "staff" | "daily";
const tabs: { value: Tab; label: string }[] = [{ value: "books", label: "Books & valuation" }, { value: "copies", label: "Copies / lost & damaged" }, { value: "loans", label: "Issue / overdue records" }, { value: "students", label: "Student-wise" }, { value: "staff", label: "Staff-wise" }, { value: "daily", label: "Date-wise issues" }];
function exportCsv(rows: object[], name: string) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const cell = (value: unknown) => { const raw = String(value ?? ""); return `"${(/^[=+@\-\t\r]/.test(raw) ? `'${raw}` : raw).replaceAll('"', '""')}"`; };
  const content = [keys.map(cell).join(","), ...rows.map(row => keys.map(key => cell((row as Record<string, unknown>)[key])).join(","))].join("\r\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF", content], { type: "text/csv;charset=utf-8;" }));
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = name; anchor.click(); URL.revokeObjectURL(url);
}

export default function LibraryReportPage() {
  const [draft, setDraft] = useState(defaults);
  const [applied, setApplied] = useState(defaults);
  const [tab, setTab] = useState<Tab>("books");
  const [report, setReport] = useState<TrusteeLibraryReport | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async (signal: AbortSignal) => {
    setLoading(true); setError("");
    try { const data = await getTrusteeLibraryReport({ ...applied, page: String(page), page_size: String(pageSize) }, signal); if (!signal.aborted) setReport(data); }
    catch (error) { if (!signal.aborted) { setReport(null); setError(error instanceof Error ? error.message : "Unable to load report."); } }
    finally { if (!signal.aborted) setLoading(false); }
  }, [applied, page, pageSize]);
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load, refresh]);
  const borrowers = report?.borrowers.filter(row => row.borrower_type === (tab === "staff" ? "staff" : "student")) || [];
  const exportRows = report ? tab === "books" ? report.stocks : tab === "copies" ? report.copies : tab === "loans" ? report.loans.results : tab === "daily" ? report.daily : borrowers : [];
  const control = "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm";
  return <div className="mx-auto max-w-[1600px] space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 p-6 text-white"><div><p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-100"><BookOpen className="h-4 w-4" />Trustee library oversight</p><h1 className="text-2xl font-bold">Library Report</h1><p className="mt-2 text-sm text-teal-100">Books, circulation, overdue loans and stock valuation for {report?.school || "your school"}.</p></div><Button variant="outline" disabled={loading} onClick={() => setRefresh(value => value + 1)} className="bg-white text-teal-900"><RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh</Button></div>
    <form onSubmit={event => { event.preventDefault(); setPage(1); setApplied({ ...draft }); }} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-2 xl:grid-cols-4">
      <label className="space-y-1 text-xs font-medium">Issued from<input type="date" value={draft.from_date} onChange={event => setDraft({ ...draft, from_date: event.target.value })} className={control} /></label>
      <label className="space-y-1 text-xs font-medium">Issued to<input type="date" value={draft.to_date} onChange={event => setDraft({ ...draft, to_date: event.target.value })} className={control} /></label>
      <label className="space-y-1 text-xs font-medium">Book<select value={draft.book} onChange={event => setDraft({ ...draft, book: event.target.value })} className={control}><option value="">All books</option>{report?.options.books.map(book => <option key={book.id} value={book.id}>{book.title}</option>)}</select></label>
      <label className="space-y-1 text-xs font-medium">Category<select value={draft.category} onChange={event => setDraft({ ...draft, category: event.target.value })} className={control}><option value="">All categories</option>{report?.options.categories.map(category => <option key={category} value={category}>{category}</option>)}</select></label>
      <label className="space-y-1 text-xs font-medium">Title / author / ISBN<input value={draft.search} onChange={event => setDraft({ ...draft, search: event.target.value })} className={control} /></label>
      <label className="space-y-1 text-xs font-medium">Borrower type<select value={draft.borrower_type} onChange={event => setDraft({ ...draft, borrower_type: event.target.value, borrower: "" })} className={control}><option value="">Students & staff</option><option value="student">Student</option><option value="staff">Staff</option></select></label>
      <label className="space-y-1 text-xs font-medium">Borrower ID<input type="number" min={1} value={draft.borrower} disabled={!draft.borrower_type} onChange={event => setDraft({ ...draft, borrower: event.target.value })} className={control} placeholder="All borrowers" /></label>
      <label className="space-y-1 text-xs font-medium">Current loan status<select value={draft.loan_status} onChange={event => setDraft({ ...draft, loan_status: event.target.value })} className={control}><option value="">All loan statuses</option>{["ISSUED", "OVERDUE", "RETURNED", "LOST", "DAMAGED"].map(status => <option key={status} value={status}>{status}</option>)}</select></label>
      <div className="flex gap-2"><Button type="submit" disabled={loading}>Apply filters</Button><Button type="button" variant="outline" disabled={loading} onClick={() => { setDraft(defaults); setApplied(defaults); setPage(1); }}>Reset</Button></div>
    </form>
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</p>}
    <p className="text-sm text-slate-600">Current stock and active/overdue totals as of {report ? date(report.current_as_of) : "today"}. Loan history: issued {report?.from_date ? `from ${date(report.from_date)}` : "at any time"} through {report ? date(report.to_date) : "today"}. Historical loans show their current status. Borrower/date/status filters apply to loan history; stock remains current.</p>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[
      ["Book titles / total copies", report ? `${report.current.total_titles} / ${report.current.total_copies}` : "—"],
      ["Available (catalogue)", report?.current.catalogue_available], ["Active issued loans", report?.current.issued], ["Overdue / past grace", report ? `${report.current.overdue} / ${report.current.past_grace}` : "—"],
      ["Student / staff active loans", report ? `${report.current.student_issued} / ${report.current.staff_issued}` : "—"],
      ["Lost / damaged copies", report ? `${report.current.lost_copies} / ${report.current.damaged_copies}` : "—"],
      ["Retained stock value", report ? money(report.current.stock_value) : "—"], ["Catalogue value", report ? money(report.current.catalogue_value) : "—"],
    ].map(([label, value]) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-xl font-bold">{loading ? "—" : value ?? "—"}</p></div>)}</div>
    {report && <div className="rounded-xl border border-teal-100 bg-teal-50 p-4 text-sm text-teal-900">Selected loan history: {report.period.total_loans} loans · {report.period.students} students · {report.period.staff} staff · {report.period.lost_loans} lost / {report.period.damaged_loans} damaged loans · Assessed fines {money(report.period.assessed_fines)} · Estimated active late fines {money(report.period.estimated_late_fines)}. Reservations: {report.current.waiting_reservations} waiting / {report.current.ready_reservations} ready.</div>}
    {!!report?.current.count_mismatches && <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{report.current.count_mismatches} titles have different catalogue and accession-copy counts. Review Books & valuation for details. Lost/damaged copy counts and loan counts are shown separately to avoid counting the same loss twice.</p>}
    <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-2">{tabs.map(item => <Button key={item.value} variant={item.value === tab ? "default" : "outline"} onClick={() => setTab(item.value)}>{item.label}</Button>)}</div><Button variant="outline" disabled={loading || !!error || !exportRows.length} onClick={() => exportCsv(exportRows, `library-${tab}-${report?.to_date}.csv`)}><Download className="mr-2 h-4 w-4" />Export {tab === "loans" ? "current page" : "CSV"}</Button></div>
    {tab === "books" && <DataTable data={report?.stocks || []} columns={stockColumns} getRowId={row => row.id} createdDate={false} search loading={loading} error={error} minWidth={2600} caption="Current book catalogue, physical copies and valuation" />}
    {tab === "copies" && <DataTable data={report?.copies || []} columns={copyColumns} getRowId={row => row.id} createdDate={false} search loading={loading} error={error} filters={[{ key: "status", label: "Copy status", optionsFrom: rows => dynamicOptions(rows, row => row.status), match: (row, value) => row.status === value }, { key: "condition", label: "Condition", optionsFrom: rows => dynamicOptions(rows, row => row.condition), match: (row, value) => row.condition === value }]} caption="Physical copies, including lost, damaged, repair and inactive copies. CSV exports all loaded copy rows." />}
    {tab === "loans" && <DataTable data={report?.loans.results || []} columns={loanColumns} getRowId={row => row.id} createdDate={false} loading={loading} error={error} minWidth={2400} manualPagination manualFiltering totalCount={report?.loans.count || 0} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={size => { setPage(1); setPageSize(size); }} caption="Issue history — select OVERDUE, LOST or DAMAGED in Current loan status to focus this report" />}
    {(tab === "students" || tab === "staff") && <DataTable data={borrowers} columns={borrowerColumns} getRowId={row => row.id} createdDate={false} search loading={loading} error={error} caption={`${tab === "staff" ? "Staff" : "Student"}-wise records for the selected issue period`} renderActions={row => <Button size="sm" variant="outline" disabled={loading} onClick={() => { const filters = { ...applied, borrower_type: row.borrower_type, borrower: String(row.borrower_id) }; setDraft(filters); setApplied(filters); setPage(1); setTab("loans"); }}>View loans</Button>} />}
    {tab === "daily" && <DataTable data={report?.daily || []} columns={dailyColumns} getRowId={row => row.date} createdDate={false} loading={loading} error={error} caption="Date-wise issue counts for the selected loan history" />}
    {report && <p className="rounded-xl bg-slate-100 p-4 text-xs leading-relaxed text-slate-600">{report.valuation_note} Overdue means the due date has passed; estimated fines apply after {report.grace_period_days} grace days. Assessed fines are recorded charges; the library has no paid/unpaid tracking, so these amounts do not represent collected revenue.</p>}
  </div>;
}
