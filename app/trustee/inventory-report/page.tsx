"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Download, Package, RefreshCw } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { getTrusteeInventoryReport, type InventoryStockReport, type StockReportRow, type StockMovement, type DailyStockRow } from "@/lib/trustee-inventory-report";

const currency = (value: string | number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(value));
const dateLabel = (value: string) => value.split("-").reverse().join("/");
const statusLabel = { healthy: "Healthy", low: "Low stock", out: "Out of stock", negative: "Negative balance" };
const numberColumn = <T,>(key: keyof T & string, header: string): DataTableColumn<T> => ({ key, header, numeric: true, render: row => String(row[key]) });
const stockColumns: DataTableColumn<StockReportRow>[] = [
  { key: "item", header: "Item / variant", search: row => [row.item_name, row.item_code, row.size, row.color], render: row => <div><p className="font-semibold">{row.item_name}</p><p className="text-xs text-slate-500">{row.item_code} · {row.size} / {row.color} · {row.unit}{!row.is_active && " · Inactive"}</p></div> },
  { key: "category", header: "Category", search: row => row.category },
  numberColumn("opening_balance", "Period opening"), numberColumn("received", "Received"), numberColumn("issued", "Issued"),
  numberColumn("returned", "Returned"), numberColumn("other_in", "Other in"), numberColumn("other_out", "Other out"),
  numberColumn("closing_balance", "Period closing"), numberColumn("current_balance", "Current balance"),
  { key: "closing_stock_value", header: "Closing value", numeric: true, render: row => currency(row.closing_stock_value) },
  { key: "current_stock_value", header: "Current value", numeric: true, render: row => currency(row.current_stock_value) },
  numberColumn("minimum_stock", "Minimum stock"),
  { key: "status", header: "Current status", render: row => <span className={`whitespace-nowrap rounded-full px-2 py-1 text-xs font-semibold ${row.stock_status === "healthy" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>{statusLabel[row.stock_status]}</span> },
];
const movementColumns: DataTableColumn<StockMovement>[] = [
  { key: "date", header: "Date", render: row => dateLabel(row.date) },
  { key: "item", header: "Item / variant", render: row => <div><p className="font-semibold">{row.item_name}</p><p className="text-xs text-slate-500">{row.item_code} · {row.size} / {row.color} · {row.unit}</p></div> },
  { key: "type", header: "Movement", render: row => row.type.replaceAll("_", " ") },
  numberColumn("quantity", "Quantity (+/−)"), numberColumn("balance_after", "Balance after"),
  { key: "unit_cost", header: "Recorded unit cost", render: row => currency(row.unit_cost) },
  { key: "recorded_value", header: "Recorded value", render: row => currency(row.recorded_value) },
  { key: "party", header: "Supplier / recipient", render: row => <div>{row.supplier || row.recipient || "—"}{row.condition && <p className="text-xs">Condition: {row.condition}</p>}</div> },
  { key: "reference", header: "Reference / invoice", render: row => <div>{row.reference || "—"}{row.invoice && <p className="text-xs">Invoice: {row.invoice}</p>}</div> },
  { key: "charge", header: "Charge", render: row => row.charged_amount !== null ? <div>{currency(row.charged_amount)}<p className="text-xs">{row.charging_type?.replaceAll("_", " ")}</p></div> : "—" },
  { key: "recorded_by", header: "Recorded by", render: row => row.recorded_by || "—" },
  { key: "academic_year", header: "Academic year", render: row => row.academic_year || "—" },
  { key: "remarks", header: "Remarks", render: row => row.remarks || "—" },
];
const dailyColumns: DataTableColumn<DailyStockRow>[] = [
  { key: "date", header: "Date", render: row => dateLabel(row.date) },
  numberColumn("opening_balance", "Opening"), numberColumn("received", "Received"), numberColumn("issued", "Issued"),
  numberColumn("returned", "Returned"), numberColumn("other_in", "Other in"), numberColumn("other_out", "Other out"),
  numberColumn("net_change", "Net change"), numberColumn("closing_balance", "Closing"),
];
type Tab = "stocks" | "transactions" | "daily" | "alerts";
const tabs: { value: Tab; label: string }[] = [{ value: "stocks", label: "Stock balances" }, { value: "transactions", label: "Received / issued & ledger" }, { value: "daily", label: "Date-wise summary" }, { value: "alerts", label: "Stock alerts" }];
const initialFilters = { from_date: "", to_date: "", item: "", category: "", search: "", stock_status: "" };

function exportCsv(rows: object[], filename: string) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const cell = (value: unknown) => {
    const raw = String(value ?? "");
    // Keep text from becoming spreadsheet formulas when exported.
    const safe = /^[=+@\-\t\r]/.test(raw) ? `'${raw}` : raw;
    return `"${safe.replaceAll('"', '""')}"`;
  };
  const content = [keys.map(cell).join(","), ...rows.map(row => keys.map(key => cell((row as Record<string, unknown>)[key])).join(","))].join("\r\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF", content], { type: "text/csv;charset=utf-8;" }));
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; anchor.click(); URL.revokeObjectURL(url);
}

export default function TrusteeInventoryReportPage() {
  const [draft, setDraft] = useState(initialFilters);
  const [applied, setApplied] = useState(initialFilters);
  const [tab, setTab] = useState<Tab>("stocks");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [refresh, setRefresh] = useState(0);
  const [report, setReport] = useState<InventoryStockReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async (signal: AbortSignal) => {
    setLoading(true); setError("");
    try {
      const data = await getTrusteeInventoryReport({ ...applied, transaction_type: type, page: String(page), page_size: String(pageSize) }, signal);
      if (!signal.aborted) setReport(data);
    } catch (error) {
      if (!signal.aborted) { setReport(null); setError(error instanceof Error ? error.message : "Unable to load report."); }
    } finally { if (!signal.aborted) setLoading(false); }
  }, [applied, type, page, pageSize]);
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load, refresh]);
  const summary = report?.summary;
  const exportRows = report ? tab === "transactions" ? report.transactions.results : tab === "daily" ? report.daily : tab === "alerts" ? report.alerts : report.stocks : [];
  const selectClass = "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm";
  return <div className="mx-auto max-w-[1600px] space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 p-6 text-white">
      <div><p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-100"><Package className="h-4 w-4" />Trustee inventory oversight</p><h1 className="text-2xl font-bold">Inventory Stock Report</h1><p className="mt-2 text-sm text-teal-100">Received items, issues, returns, stock balances and valuation for {report?.school || "your school"}.</p></div>
      <Button variant="outline" disabled={loading} onClick={() => setRefresh(value => value + 1)} className="bg-white text-teal-900"><RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh</Button>
    </div>
    <form className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-2 xl:grid-cols-4" onSubmit={event => { event.preventDefault(); setPage(1); setApplied({ ...draft }); }}>
      <label className="space-y-1 text-xs font-medium">From date<DatePicker className="w-full" value={draft.from_date} onChange={date => setDraft({ ...draft, from_date: date })} aria-label="From date" disableFuture={true} /></label>
      <label className="space-y-1 text-xs font-medium">To date<DatePicker className="w-full" value={draft.to_date} onChange={date => setDraft({ ...draft, to_date: date })} aria-label="To date" min={draft.from_date || undefined} disableFuture={true} /></label>
      <label className="space-y-1 text-xs font-medium">Item<select value={draft.item} onChange={event => setDraft({ ...draft, item: event.target.value })} className={selectClass}><option value="">All items</option>{report?.options.items.map(item => <option key={item.id} value={item.id}>{item.name} ({item.code})</option>)}</select></label>
      <label className="space-y-1 text-xs font-medium">Category<select value={draft.category} onChange={event => setDraft({ ...draft, category: event.target.value })} className={selectClass}><option value="">All categories</option>{report?.options.categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
      <label className="space-y-1 text-xs font-medium">Current stock status<select value={draft.stock_status} onChange={event => setDraft({ ...draft, stock_status: event.target.value })} className={selectClass}><option value="">All statuses</option>{Object.entries(statusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="space-y-1 text-xs font-medium">Item name / code<input value={draft.search} onChange={event => setDraft({ ...draft, search: event.target.value })} className={selectClass} placeholder="Search inventory" /></label>
      <div className="flex items-end gap-2"><Button type="submit" disabled={loading}>Apply filters</Button><Button variant="outline" type="button" disabled={loading} onClick={() => { setDraft(initialFilters); setApplied(initialFilters); setPage(1); setType(""); }}>Reset</Button></div>
    </form>
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</p>}
    <p className="text-sm text-slate-600">Period: {report?.from_date ? dateLabel(report.from_date) : "All recorded history"} to {report ? dateLabel(report.to_date) : "today"}. Current balances: {report ? dateLabel(report.current_as_of) : "today"}. Quantities combine units; use the item filter for a single unit.</p>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[
      ["Items / variants", summary ? `${summary.total_items} / ${summary.total_variants}` : "—"],
      ["Current stock balance", summary?.current_balance], ["Current stock value", summary ? currency(summary.current_stock_value) : "—"],
      ["Low / out / negative", summary ? `${summary.low_stock_count} / ${summary.out_of_stock_count} / ${summary.negative_stock_count}` : "—"],
      ["Received in period", summary?.received], ["Issued in period", summary?.issued], ["Returned in period", summary?.returned],
      ["Period closing value", summary ? currency(summary.closing_stock_value) : "—"],
    ].map(([label, value]) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-xl font-bold">{loading ? "—" : value ?? "—"}</p></div>)}</div>
    {!!report?.alerts.length && <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><AlertTriangle className="h-5 w-5 shrink-0" />{report.alerts.length} stock variants need attention. Open Stock alerts for quantities and minimum levels.</div>}
    <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-2">{tabs.map(item => <Button key={item.value} variant={tab === item.value ? "default" : "outline"} onClick={() => setTab(item.value)}>{item.label}</Button>)}</div><Button variant="outline" disabled={loading || !exportRows.length || !!error} onClick={() => exportCsv(exportRows, `inventory-${tab}-${report?.to_date}.csv`)}><Download className="mr-2 h-4 w-4" />Export {tab === "transactions" ? "current page" : "CSV"}</Button></div>
    {(tab === "stocks" || tab === "alerts") && <DataTable data={(tab === "alerts" ? report?.alerts : report?.stocks) || []} columns={stockColumns} getRowId={row => row.id} createdDate={false} loading={loading} error={error} minWidth={1800} caption={tab === "alerts" ? "Current low, out-of-stock and negative balances" : "Period movements and current stock by size / color"} emptyTitle={tab === "alerts" ? "No stock alerts for this selection." : "No inventory items found."} />}
    {tab === "daily" && <DataTable data={report?.daily || []} columns={dailyColumns} getRowId={row => row.date} createdDate={false} loading={loading} error={error} caption="Daily opening, movement and closing balances (days with recorded movements)" />}
    {tab === "transactions" && <DataTable data={report?.transactions.results || []} columns={movementColumns} getRowId={row => row.id} createdDate={false} loading={loading} error={error} minWidth={2200} manualFiltering manualPagination totalCount={report?.transactions.count || 0} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={size => { setPage(1); setPageSize(size); }} caption="Stock ledger — quantities and balances reflect every movement; the movement filter only changes this table" toolbarExtra={<label className="text-xs">Movement type<select className={`${selectClass} ml-2 !w-auto`} aria-label="Movement type" value={type} onChange={event => { setType(event.target.value); setPage(1); }}><option value="">All movements</option>{report?.options.transaction_types.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>} />}
    {report && <p className="rounded-xl bg-slate-100 p-4 text-xs leading-relaxed text-slate-600">{report.valuation_method} Received means purchase receipts; opening stock and positive adjustments appear under Other in. Returns are shown separately. Low-stock thresholds apply per size/color variant. Recorded movement values use the original ledger cost, which may be zero.</p>}
  </div>;
}
