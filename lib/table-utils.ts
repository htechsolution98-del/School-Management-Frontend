/**
 * Shared helpers used by the reusable DataTable across every module.
 * Date handling is defensive because the API mixes ISO datetimes with
 * "%d-%m-%Y" strings (REST_FRAMEWORK DATE_FORMAT).
 */

const DATE_KEYS = ["created_at", "createdAt", "created_on", "createdOn", "created_date", "createdDate"];

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * Presentation helper for the lowercase-stored backend text.
 * "AHEMDABAD" / "ahemdabad" / "ahemdabad city" -> "Ahemdabad City".
 */
export function camelCaseText(value: unknown): string {
  if (value == null) return "";
  return String(value)
    .split(/(\s+|-+|_+)/)
    .map((token) => {
      if (!token.trim()) return token;
      if (token === "-" || token === "_") return token;
      const lower = token.toLowerCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join("");
}

/** Same as `camelCaseText` but preserves empty/absent values as an em dash. */
export function camelCell(value: unknown, empty = "—"): string {
  if (value == null || value === "") return empty;
  const text = camelCaseText(value);
  return text.trim() ? text : empty;
}

/** Best-effort parse of the many date shapes the API can return. */
export function parseApiDate(value: unknown): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;

  if (typeof value === "number") {
    const fromNumber = new Date(value);
    return isNaN(fromNumber.getTime()) ? null : fromNumber;
  }

  const raw = String(value).trim();
  if (!raw) return null;

  // ISO 8601 / RFC 3339 -> native parse
  if (/^\d{4}-\d{2}-\d{2}([T ]|$)/.test(raw)) {
    const iso = new Date(raw.includes("T") || raw.includes(" ") ? raw.replace(" ", "T") : `${raw}T00:00:00`);
    if (!isNaN(iso.getTime())) return iso;
  }

  // dd-mm-yyyy [hh:mm[:ss[.ffffff]]] (API DATE_FORMAT)
  const dash = raw.match(/^(\d{1,2})-(\d{1,2})-(\d{4})(?:[T\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (dash) {
    const [, day, month, year, hour, minute, second] = dash;
    return new Date(Number(year), Number(month) - 1, Number(day), Number(hour ?? 0), Number(minute ?? 0), Number(second ?? 0));
  }

  // dd/mm/yyyy or dd.mm.yyyy
  const slash = raw.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})/);
  if (slash) {
    const [, day, month, year] = slash;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  // yyyy-mm-dd with slashes
  const isoSlash = raw.match(/^(\d{4})[/.](\d{1,2})[/.](\d{1,2})/);
  if (isoSlash) {
    const [, year, month, day] = isoSlash;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const fallback = new Date(raw);
  return isNaN(fallback.getTime()) ? null : fallback;
}

/** Strict DD/MM/YYYY rendering. Returns "—" when the value cannot be parsed. */
export function formatDDMMYYYY(value: unknown): string {
  const parsed = parseApiDate(value);
  if (!parsed) return "—";
  return `${pad(parsed.getDate())}/${pad(parsed.getMonth() + 1)}/${parsed.getFullYear()}`;
}

/** DD/MM/YYYY plus HH:MM when a time component exists. */
export function formatDateTimeDDMMYYYY(value: unknown): string {
  const parsed = parseApiDate(value);
  if (!parsed) return "—";
  const time = `${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
  return `${formatDDMMYYYY(parsed)} ${time}`;
}

/** yyyy-mm-dd for <input type="date"> bounds. */
export function toInputDate(value: unknown): string {
  const parsed = parseApiDate(value);
  if (!parsed) return "";
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`;
}

/** Reads the creation timestamp off an arbitrary record. */
export function getCreatedAt(row: unknown, key?: string): unknown {
  if (!row || typeof row !== "object") return null;
  const record = row as Record<string, unknown>;
  const candidate = key ?? DATE_KEYS.find((name) => record[name] != null);
  if (!candidate) return null;
  const value = record[candidate];
  return value == null || value === "" ? null : value;
}

export function startOfDay(value: unknown): Date | null {
  const parsed = parseApiDate(value);
  if (!parsed) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

export function endOfDay(value: unknown): Date | null {
  const parsed = parseApiDate(value);
  if (!parsed) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 23, 59, 59, 999);
}

/** Case-insensitive "does any of these values contain the query" test. */
export function matchesQuery(query: string, values: unknown[]): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return values.some((value) => {
    if (value == null) return false;
    if (typeof value === "number" || typeof value === "boolean") return String(value).toLowerCase().includes(needle);
    return String(value).toLowerCase().includes(needle);
  });
}

/** Collects the distinct values of a field so filters can be built from live data. */
export function distinctValues<T>(rows: T[], accessor: (row: T) => unknown): string[] {
  const seen = new Map<string, string>();
  for (const row of rows) {
    const value = accessor(row);
    if (value == null || value === "") continue;
    const label = String(value);
    if (!seen.has(label)) seen.set(label, label);
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
}

/** Clamps the page index when filtering shrinks the result set. */
export function safePage<T>(rows: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize;
  return rows.slice(start, start + pageSize);
}