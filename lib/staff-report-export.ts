import type { StaffReport, StaffReportRow } from "@/lib/trustee-staff-report";

export function staffReportTables(report: StaffReport): { name: string; rows: StaffReportRow[] }[] {
  return [
    { name: "Summary", rows: Object.entries(report.summary).map(([metric, value]) => ({ metric, value })) },
    { name: "Staff directory", rows: report.staff.results },
    ...Object.entries(report.distribution).map(([name, rows]) => ({ name: `${name} distribution`, rows })),
    ...Object.entries(report.attendance).map(([name, rows]) => ({ name: `${name} attendance`, rows })),
    { name: "Attendance history", rows: report.attendance_records }, { name: "Absence frequency", rows: report.frequent_absence },
    { name: "Leave applications", rows: report.leave_records }, { name: "Leave balances", rows: report.leave_balances },
    { name: "Leave types", rows: report.leave_types }, { name: "Department leaves", rows: report.leave_departments },
    { name: "Leave trends", rows: report.leave_trends }, { name: "Strength and turnover", rows: report.strength_trends },
    ...(report.permissions.salary ? [
      { name: "Payroll history", rows: report.payroll_records }, { name: "Payroll components", rows: report.payroll_components },
      { name: "Monthly payroll", rows: report.payroll_months }, { name: "Annual payroll", rows: report.payroll_years },
      { name: "Department payroll", rows: report.payroll_departments },
    ] : []),
    { name: "Unavailable source data", rows: Object.entries(report.unavailable).map(([section, details]) => ({ section, details })) },
  ];
}
const human = (key: string) => key.replaceAll("_", " ");
const cell = (value: unknown) => value === null || value === undefined ? "Not available" : typeof value === "boolean" ? value ? "Yes" : "No" : String(value);

export async function createStaffExcelBuffer(report: StaffReport, filters: Record<string, string>) {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Trustee Staff Reports";
  const context = workbook.addWorksheet("Report context");
  context.addRows([["School", report.school], ["Generated", report.generated_at], ["Activity from", report.from_date], ["Activity to", report.to_date],
    ["Salary access", report.permissions.salary ? "Granted" : "Restricted"], ["Contact access", report.permissions.contacts ? "Granted" : "Restricted"],
    ...Object.entries(filters).filter(([, value]) => value), ...report.notes.map(note => ["Definition", note])]);
  context.getColumn(1).width = 26; context.getColumn(2).width = 100; context.getColumn(2).alignment = { wrapText: true };
  for (const table of staffReportTables(report)) {
    const sheet = workbook.addWorksheet(table.name.slice(0, 31));
    if (!table.rows.length) { sheet.addRow(["No records for selected filters / source not maintained"]); continue; }
    const keys = Object.keys(table.rows[0]);
    sheet.columns = keys.map(key => ({ header: human(key), key, width: key.includes("name") || key.includes("fields") ? 34 : 22 }));
    table.rows.forEach(row => sheet.addRow(Object.fromEntries(keys.map(key => [key, row[key] === null ? "Not available" : row[key]]))));
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F766E" } };
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: keys.length } };
  }
  return workbook.xlsx.writeBuffer();
}

export async function createStaffPdf(report: StaffReport, filters: Record<string, string>) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a3" });
  doc.setFontSize(18); doc.text(doc.splitTextToSize(`${report.school} — Staff Management Report`, 385), 14, 17);
  doc.setFontSize(9); doc.text(`Generated ${report.generated_at} | ${report.from_date} to ${report.to_date} | Read-only`, 14, 33);
  autoTable(doc, { startY: 39, head: [["Selected filter", "Value"]], body: Object.entries(filters).filter(([, value]) => value).map(([key, value]) => [human(key), value]), styles: { fontSize: 9 }, headStyles: { fillColor: [15, 118, 110] } });
  const tables = staffReportTables(report).flatMap(table => {
    if (table.name !== "Staff directory") return [table];
    const keys = table.rows.length ? Object.keys(table.rows[0]) : [];
    const sections = [];
    // Keep readable column widths, repeating identity in every section.
    for (let index = 0; index < keys.length; index += 9) {
      const subset = Array.from(new Set(["id", "name", ...keys.slice(index, index + 9)]));
      sections.push({ name: `Staff directory ${Math.floor(index / 9) + 1}`, rows: table.rows.map(row => Object.fromEntries(subset.map(key => [key, row[key]]))) });
    }
    return sections;
  });
  for (const table of tables) {
    if (!table.rows.length) continue;
    doc.addPage(); doc.setFontSize(13); doc.text(table.name, 14, 16);
    const keys = Object.keys(table.rows[0]);
    autoTable(doc, { startY: 22, head: [keys.map(human)], body: table.rows.map(row => keys.map(key => cell(row[key]))),
      styles: { fontSize: 7, cellPadding: 2, overflow: "linebreak" }, headStyles: { fillColor: [15, 118, 110] }, horizontalPageBreak: true, horizontalPageBreakRepeat: 0 });
  }
  doc.addPage(); doc.setFontSize(13); doc.text("Definitions and permissions", 14, 16);
  autoTable(doc, { startY: 22, body: [[`Salary access: ${report.permissions.salary ? "Granted" : "Restricted"}; Contact access: ${report.permissions.contacts ? "Granted" : "Restricted"}`], ...report.notes.map(note => [note])], styles: { fontSize: 9, cellPadding: 3 } });
  for (let page = 1; page <= doc.getNumberOfPages(); page++) { doc.setPage(page); doc.setFontSize(8); doc.text(`Trustee report | ${page} / ${doc.getNumberOfPages()}`, 14, doc.internal.pageSize.getHeight() - 8); }
  return doc;
}

export async function exportStaffReport(report: StaffReport, filters: Record<string, string>, format: "excel" | "pdf" | "print") {
  if (format === "excel") {
    const buffer = await createStaffExcelBuffer(report, filters);
    const url = URL.createObjectURL(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `trustee-staff-${report.to_date}.xlsx`; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  } else {
    const doc = await createStaffPdf(report, filters);
    // The PDF viewer provides reliable printing without clipped dashboard tables.
    if (format === "print") doc.autoPrint();
    doc.save(`trustee-staff-${report.to_date}${format === "print" ? "-print" : ""}.pdf`);
  }
}
