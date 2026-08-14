export function toHTMLDate(apiDate: string | null | undefined): string {
  if (!apiDate) return "";
  // API returns DD-MM-YYYY, HTML input needs YYYY-MM-DD
  if (apiDate.includes("-")) {
    const parts = apiDate.split("-");
    if (parts[0].length === 2 && parts[2]?.length === 4) {
      // DD-MM-YYYY -> YYYY-MM-DD
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
  }
  return apiDate;
}

export function toApiDate(htmlDate: string | null | undefined): string {
  if (!htmlDate) return "";
  // HTML input gives YYYY-MM-DD, API needs DD-MM-YYYY
  if (htmlDate.includes("-")) {
    const parts = htmlDate.split("-");
    if (parts[0].length === 4 && parts[2]?.length === 2) {
      // YYYY-MM-DD -> DD-MM-YYYY
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
  }
  return htmlDate;
}

export function parseDateString(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const isoStr = toHTMLDate(dateStr);
  if (!isoStr) return null;
  const d = new Date(`${isoStr}T00:00:00`);
  return isNaN(d.getTime()) ? null : d;
}

export function calculateDaysBetween(startDateStr: string, endDateStr: string): number {
  const start = parseDateString(startDateStr);
  const end = parseDateString(endDateStr);
  if (!start || !end || end < start) return 0;

  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
}
