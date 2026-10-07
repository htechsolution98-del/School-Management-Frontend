"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";
import {
  camelCaseText,
  distinctValues,
  endOfDay,
  formatDDMMYYYY,
  getCreatedAt,
  matchesQuery,
  safePage,
  startOfDay,
  toInputDate,
} from "@/lib/table-utils";

export type DataTableAlign = "left" | "center" | "right";

export interface DataTableColumn<T> {
  /** Stable identifier, also used as the default search source. */
  key: string;
  header: React.ReactNode;
  /** Cell renderer. Defaults to the raw value from `searchValues`. */
  render?: (row: T, index: number) => React.ReactNode;
  /** Values fed into global search. Omit to opt a column out of search. */
  search?: (row: T) => unknown[] | string | null | undefined;
  align?: DataTableAlign;
  headClassName?: string;
  cellClassName?: string;
  /** Sticky column for wide tables (keeps identity visible while scrolling). */
  sticky?: boolean;
  /** Numeric columns right-align. */
  numeric?: boolean;
  /**
   * Render lowercase backend text as Camel Case (default true).
   * Set to false for values that must stay verbatim (codes, emails, ids, raw JSON).
   */
  camelCase?: boolean;
}

export interface DataTableFilterOption {
  value: string;
  label: string;
}

export interface DataTableFilterDef<T> {
  key: string;
  label: string;
  /** Static list, or derived from the loaded rows. */
  options?: DataTableFilterOption[];
  /** Derive the option list from live data (dynamic filtering). */
  optionsFrom?: (rows: T[]) => DataTableFilterOption[];
  /** Predicate used for client-side filtering. */
  match?: (row: T, value: string) => boolean;
  /** Values searched when building the dynamic option list. */
  distinct?: (row: T) => string | null | undefined;
  /** Set to false to show option labels verbatim instead of Camel Case. */
  camelCase?: boolean;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Array<DataTableColumn<T>>;
  getRowId: (row: T, index: number) => React.Key;
  /** Renders the trailing actions column when provided. */
  renderActions?: (row: T, index: number) => React.ReactNode;
  actionsHeader?: React.ReactNode;
  actionsWidth?: string;
  loading?: boolean;
  /** Disables the row-hover/loading text and shows skeleton rows instead. */
  error?: string;
  /** Adds the leading `Created Date` column (DD/MM/YYYY). Defaults to true; pass false to opt out. */
  createdDate?: boolean;
  /** Override the field used for the created date column. */
  createdDateKey?: string;
  /** Override the created date column header. */
  createdDateHeader?: React.ReactNode;
  search?: boolean;
  searchPlaceholder?: string;
  searchAriaLabel?: string;
  /** Extra client-side searchable values per row. */
  searchExtra?: (row: T) => unknown[];
  filters?: Array<DataTableFilterDef<T>>;
  /** Adds a Created Date range filter (from/to). */
  createdDateRange?: boolean;
  /** Extra content rendered at the right of the toolbar. */
  toolbarExtra?: React.ReactNode;
  pageSize?: number;
  pageSizeOptions?: number[];
  /** Use when rows already come paginated from the API. */
  manualPagination?: boolean;
  totalCount?: number;
  page?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  /** Server-side search/filter escape hatch: disables internal filtering. */
  manualFiltering?: boolean;
  minWidth?: number | string;
  emptyTitle?: string;
  emptyDescription?: string;
  /** Shown instead of `emptyTitle` when rows exist but filters exclude them. */
  noResultsTitle?: string;
  noResultsDescription?: string;
  loadingLabel?: string;
  caption?: React.ReactNode;
  footerNote?: React.ReactNode;
  rowClassName?: (row: T, index: number) => string | undefined;
  maxHeight?: string;
}

const ALIGN_CLASS: Record<DataTableAlign, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

function filterSelectClass() {
  return "h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-600";
}

/** Default cell content when a column has no explicit `render`. */
function readCellFallback<T>(column: DataTableColumn<T>, row: T): string {
  if (typeof column.search !== "function") return "";
  const values = column.search(row);
  const raw = Array.isArray(values) ? String(values[0] ?? "") : String(values ?? "");
  if (!raw) return "";
  return column.camelCase === false ? raw : camelCaseText(raw);
}

export function DataTable<T>({
  data,
  columns,
  getRowId,
  renderActions,
  actionsHeader = "Actions",
  actionsWidth,
  loading = false,
  error = "",
  createdDate = true,
  createdDateKey,
  createdDateHeader = "Created Date",
  search = false,
  searchPlaceholder = "Search…",
  searchAriaLabel = "Search",
  searchExtra,
  filters,
  createdDateRange = false,
  toolbarExtra,
  pageSize: pageSizeProp = 10,
  pageSizeOptions = [10, 25, 50, 100],
  manualPagination = false,
  totalCount,
  page: pageProp,
  onPageChange,
  onPageSizeChange,
  manualFiltering = false,
  minWidth = 920,
  emptyTitle = "No records found.",
  emptyDescription,
  noResultsTitle = "No records match your search.",
  noResultsDescription,
  loadingLabel = "Loading…",
  caption,
  footerNote,
  rowClassName,
  maxHeight,
}: DataTableProps<T>) {
  const [query, setQuery] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [dateFrom, setDateFrom] = useState("");
  const today = toInputDate(new Date());
  const [dateTo, setDateTo] = useState("");
  const [pageSize, setPageSize] = useState(pageSizeProp);
  const [internalPage, setInternalPage] = useState(1);

  const page = manualPagination ? Math.max(1, pageProp ?? 1) : internalPage;
  const setPage = (next: number) => {
    if (manualPagination) onPageChange?.(next);
    else setInternalPage(Math.max(1, next));
  };
  const changePageSize = (next: number) => {
    if (onPageSizeChange) onPageSizeChange(next);
    setPageSize(next);
    setPage(1);
  };

  const activeFilters = filters ?? [];
  const hasActiveFilter = activeFilters.some(filter => (filterValues[filter.key] ?? "all") !== "all");

  const resolvedFilters = useMemo(
    () =>
      activeFilters.map(filter => {
        const options = filter.options ?? (filter.optionsFrom ? filter.optionsFrom(data) : []);
        return { ...filter, resolvedOptions: options };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeFilters, data],
  );

  const filtered = useMemo(() => {
    if (manualFiltering) return data;
    const activeQuery = query.trim();
    const activeRange = createdDateRange && (dateFrom || dateTo);
    const start = dateFrom ? startOfDay(dateFrom) : null;
    const end = dateTo ? endOfDay(dateTo) : null;
    const needsDateCheck = Boolean(activeRange);

    return data.filter(row => {
      if (activeQuery) {
        const columnValues = columns.flatMap(column =>
          typeof column.search === "function" ? column.search(row) : [],
        );
        const extras = searchExtra ? searchExtra(row) : [];
        if (!matchesQuery(activeQuery, [...columnValues, ...extras])) return false;
      }
      if (resolvedFilters.length) {
        for (const filter of resolvedFilters) {
          const value = filterValues[filter.key];
          if (!value || value === "all" || !filter.match) continue;
          if (!filter.match(row, value)) return false;
        }
      }
      if (needsDateCheck) {
        const created = startOfDay(getCreatedAt(row, createdDateKey));
        if (!created) return false;
        if (start && created < start) return false;
        if (end && created > end) return false;
      }
      return true;
    });
  }, [
    data,
    columns,
    query,
    searchExtra,
    manualFiltering,
    resolvedFilters,
    filterValues,
    createdDateRange,
    createdDateKey,
    dateFrom,
    dateTo,
  ]);

  const effectiveTotal = manualPagination ? (totalCount ?? data.length) : filtered.length;
  const totalPages = Math.max(1, Math.ceil(effectiveTotal / pageSize));
  const safeCurrentPage = Math.min(page, totalPages);
  const visible = manualPagination ? data : safePage(filtered, safeCurrentPage, pageSize);
  const from = effectiveTotal === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const to = Math.min(safeCurrentPage * pageSize, effectiveTotal);
  const hasFilters = Boolean(query.trim()) || hasActiveFilter || (createdDateRange && (dateFrom || dateTo));

  const minWidthValue = typeof minWidth === "number" ? `${minWidth}px` : minWidth;

  const allColumns: Array<DataTableColumn<T>> = createdDate
    ? [
        {
          key: "__created",
          header: createdDateHeader,
          align: "left",
          render: row => <span className="whitespace-nowrap text-slate-600">{formatDDMMYYYY(getCreatedAt(row, createdDateKey))}</span>,
        },
        ...columns,
      ]
    : columns;

  const width = allColumns.length + (renderActions ? 1 : 0);

  const updateFilter = (key: string, value: string) => {
    setFilterValues(current => ({ ...current, [key]: value }));
    setPage(1);
  };

  const clearAll = () => {
    setQuery("");
    setFilterValues({});
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      {(search || resolvedFilters.length || createdDateRange || toolbarExtra) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
          <div className="flex flex-wrap items-center gap-3">
            {search && (
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  aria-label={searchAriaLabel}
                  value={query}
                  onChange={event => {
                    setQuery(event.target.value);
                    setPage(1);
                  }}
                  placeholder={searchPlaceholder}
                  className="h-10 rounded-lg border-slate-200 pl-9"
                />
              </div>
            )}
            {hasFilters && (
              <button
                type="button"
                onClick={clearAll}
                className="h-10 cursor-pointer rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
              >
                Clear filters
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {createdDateRange && (
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-xs text-slate-500" htmlFor={`${createdDateHeader}-from`}>
                  From
                </label>
                <DatePicker
                  id={`${createdDateHeader}-from`}
                  aria-label="Created date from"
                  value={dateFrom}
                  max={dateTo && dateTo < today ? dateTo : today}
                  onChange={value => {
                    setDateFrom(value);
                    setPage(1);
                  }}
                  className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-600"
                />
                <label className="text-xs text-slate-500" htmlFor={`${createdDateHeader}-to`}>To</label>
                <DatePicker
                  id={`${createdDateHeader}-to`}
                  aria-label="Created date to"
                  value={dateTo}
                  min={dateFrom || undefined}
                  max={today}
                  onChange={value => {
                    setDateTo(value);
                    setPage(1);
                  }}
                  className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-600"
                />
              </div>
            )}
            {resolvedFilters.map(filter => (
              <select
                key={filter.key}
                aria-label={filter.label}
                value={filterValues[filter.key] ?? "all"}
                onChange={event => updateFilter(filter.key, event.target.value)}
                className={filterSelectClass()}
              >
                <option value="all">{filter.label}: All</option>
                {filter.resolvedOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {filter.camelCase === false ? option.label : camelCaseText(option.label)}
                  </option>
                ))}
              </select>
            ))}
            {toolbarExtra}
          </div>
        </div>
      )}

      <div className={cn("overflow-x-auto", maxHeight && "overflow-y-auto")} style={maxHeight ? { maxHeight } : undefined}>
        <table className="w-full text-left text-sm" style={{ minWidth: minWidthValue }}>
          <caption className="sr-only">{typeof caption === "string" ? caption : "Records"}</caption>
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
            <tr>
              {allColumns.map(column => (
                <th
                  key={column.key}
                  scope="col"
                  style={column.sticky ? { position: "sticky", left: 0, zIndex: 1 } : undefined}
                  className={cn(
                    "px-5 py-3 font-medium",
                    ALIGN_CLASS[column.align ?? (column.numeric ? "right" : "left")],
                    column.sticky && "bg-slate-50",
                    column.headClassName,
                  )}
                >
                  {column.header}
                </th>
              ))}
              {renderActions && (
                <th scope="col" className="px-5 py-3 text-right font-medium" style={actionsWidth ? { width: actionsWidth } : undefined}>
                  {actionsHeader}
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              Array.from({ length: 6 }).map((_, index) => (
                <tr key={`skeleton-${index}`} className="align-middle">
                  {allColumns.map(column => (
                    <td key={column.key} className="px-5 py-4">
                      <span className="block h-3.5 w-full animate-pulse rounded bg-slate-100" />
                    </td>
                  ))}
                  {renderActions && (
                    <td className="px-5 py-4">
                      <span className="ml-auto block h-8 w-20 animate-pulse rounded bg-slate-100" />
                    </td>
                  )}
                </tr>
              ))
            ) : !visible.length ? (
              <tr>
                <td colSpan={width} className="px-5 py-14 text-center text-slate-500">
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {loadingLabel}
                    </span>
                  ) : error ? (
                    <p>{error}</p>
                  ) : data.length && hasFilters ? (
                    <div>
                      <p className="font-medium text-slate-600">{noResultsTitle}</p>
                      {noResultsDescription && <p className="mt-1 text-xs">{noResultsDescription}</p>}
                    </div>
                  ) : (
                    <div>
                      <p className="font-medium text-slate-600">{emptyTitle}</p>
                      {emptyDescription && <p className="mt-1 text-xs">{emptyDescription}</p>}
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              visible.map((row, index) => (
                <tr
                  key={getRowId(row, index)}
                  className={cn("align-middle transition-colors hover:bg-slate-50/70", rowClassName?.(row, index))}
                >
                  {allColumns.map(column => {
                    const content = column.render
                      ? column.render(row, index)
                      : String(readCellFallback(column, row));
                    return (
                      <td
                        key={column.key}
                        className={cn(
                          "px-5 py-4 align-middle",
                          ALIGN_CLASS[column.align ?? (column.numeric ? "right" : "left")],
                          column.cellClassName,
                        )}
                      >
                        {content}
                      </td>
                    );
                  })}
                  {renderActions && (
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-1">{renderActions(row, index)}</div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <span>
            {loading
              ? "Loading…"
              : effectiveTotal === 0
                ? "0 records"
                : `Showing ${from}–${to} of ${effectiveTotal}`}
          </span>
          {footerNote}
          {!loading && effectiveTotal > 0 && (
            <label className="flex items-center gap-2">
              <span>Rows per page</span>
              <select
                aria-label="Rows per page"
                value={pageSize}
                onChange={event => changePageSize(Number(event.target.value))}
                className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-600"
              >
                {pageSizeOptions.map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        {!loading && effectiveTotal > 0 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Previous page"
              disabled={safeCurrentPage <= 1}
              onClick={() => setPage(safeCurrentPage - 1)}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="whitespace-nowrap">
              Page {safeCurrentPage} of {totalPages}
            </span>
            <button
              type="button"
              aria-label="Next page"
              disabled={safeCurrentPage >= totalPages}
              onClick={() => setPage(safeCurrentPage + 1)}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

export default DataTable;

/** Helper for building dynamic filter option lists straight from the loaded rows. */
export function dynamicOptions<T>(rows: T[], accessor: (row: T) => string | null | undefined, labeler?: (value: string) => string): DataTableFilterOption[] {
  return distinctValues(rows, accessor).map(value => ({ value, label: labeler ? labeler(value) : value }));
}
