import type { StudentReport } from "@/lib/trustee-student-report";

export function toTitleCase(str: string): string {
  if (!str) return "";
  return str
    .replace(/[_-]+/g, " ")
    .trim()
    .split(/\s+/)
    .map(word => {
      const lower = word.toLowerCase();
      if (lower === "id") return "ID";
      if (lower === "gr" || lower === "no") return lower.toUpperCase();
      if (lower === "inr" || lower === "rte" || lower === "otp" || lower === "gst" || lower === "dob") return lower.toUpperCase();
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

export function formatReportTimestamp(val: unknown): string {
  if (!val) return "—";
  const str = String(val).trim();
  if (/^\d{2}-[A-Za-z]{3}-\d{4}\s+\d{1,2}:\d{2}\s+(AM|PM)$/i.test(str)) {
    return str;
  }
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const day = String(d.getDate()).padStart(2, "0");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    const hoursStr = String(hours).padStart(2, "0");
    return `${day}-${month}-${year} ${hoursStr}:${minutes} ${ampm}`;
  }
  return str;
}

function tables(report: StudentReport) {
  return [
    { name: "Summary", rows: Object.entries(report.summary).map(([metric, value]) => ({ metric: toTitleCase(metric), value })) },
    { name: "Students", rows: report.students.results }, { name: "Class Strength", rows: report.class_strength },
    { name: "Division Strength", rows: report.division_strength }, { name: "Gender", rows: report.gender },
    { name: "Categories", rows: report.categories }, { name: "Student Status", rows: report.status },
    { name: "Academic Year Participation", rows: report.enrollment_trends }, { name: "New Admissions By Year", rows: report.admission_trends },
    { name: "Daily Attendance", rows: report.attendance }, { name: "Monthly Collections", rows: report.collections },
    { name: "Exam Summary", rows: report.exams }, { name: "Exam Result Records", rows: report.result_records },
    { name: "Fee Ledger", rows: report.fee_records },
  ] as { name: string; rows: object[] }[];
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; anchor.click(); URL.revokeObjectURL(url);
}

export async function createStudentExcelBuffer(report: StudentReport, filters: Record<string, string>) {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "School Trustee Reports";
  const context = workbook.addWorksheet("Report Context");
  context.addRows([
    ["School", report.school],
    ["Generated", formatReportTimestamp(report.generated_at)],
    ["Date From", report.from_date || "All recorded dates"],
    ["Date To", report.to_date],
    ...Object.entries(filters).filter(([, value]) => value).map(([k, v]) => [toTitleCase(k), v]),
    ...report.notes.map(note => ["Definition", note])
  ]);
  context.getColumn(1).width = 25; context.getColumn(2).width = 110;
  context.getColumn(2).alignment = { wrapText: true, vertical: "top" };

  for (const table of tables(report)) {
    const sheetTitle = toTitleCase(table.name).slice(0, 31);
    const sheet = workbook.addWorksheet(sheetTitle);
    if (!table.rows.length) { sheet.addRow(["No records for this selection"]); continue; }
    const keys = Object.keys(table.rows[0]);
    sheet.columns = keys.map(key => ({ header: toTitleCase(key), key, width: key.includes("name") || key === "title" ? 30 : 20 }));
    for (const row of table.rows) {
      sheet.addRow(Object.fromEntries(Object.entries(row).map(([key, value]) => [key, value === null ? "Not recorded" : value])));
    }
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F766E" } };
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: keys.length } };
  }
  return workbook.xlsx.writeBuffer();
}

export async function exportStudentExcel(report: StudentReport, filters: Record<string, string>) {
  const buffer = await createStudentExcelBuffer(report, filters);
  download(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `trustee-students-${report.to_date}.xlsx`);
}

export async function createStudentPdf(report: StudentReport, filters: Record<string, string>) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a3" });
  doc.setFontSize(18); doc.text(`${report.school} - Student Management & Reports`, 14, 18);
  doc.setFontSize(9); doc.text(`Generated ${formatReportTimestamp(report.generated_at)} | ${report.from_date || "All recorded dates"} to ${report.to_date}`, 14, 25);
  doc.text(doc.splitTextToSize(`Filters: ${Object.entries(filters).filter(([, value]) => value).map(([key, value]) => `${toTitleCase(key)}=${value}`).join(", ") || "All students"}`, 385), 14, 31);
  autoTable(doc, {
    startY: 45,
    head: [["Metric", "Value"]],
    body: Object.entries(report.summary).map(([key, value]) => [toTitleCase(key), String(value ?? "Not available")]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [15, 118, 110] }
  });

  const studentSections = [
    ["id", "name", "gr_no", "roll_no", "class_name", "division", "academic_year", "is_active", "student_status", "gender", "category", "is_rte", "admission_date", "leaving_date"],
    ["id", "name", "present", "absent", "unmarked", "attendance_percentage", "exam_percentage", "graded_results", "final_percentage", "final_grade", "final_year"],
    ["id", "name", "payable", "credited_paid", "pending", "overdue_due", "govt_pending", "student_collection", "government_collection"],
    ["id", "name", "date_of_birth", "father_name", "mother_name", "mobile"],
  ];
  const rest = tables(report).filter(table => !["Summary", "Students"].includes(table.name));
  const sections = [
    ...studentSections.map((keys, index) => ({
      name: `Students - ${["Profile", "Attendance & Performance", "Fees", "Contact"][index]}`,
      rows: report.students.results.map(row => Object.fromEntries(keys.map(key => [key, row[key as keyof typeof row]])))
    })),
    ...rest
  ];

  for (const table of sections) {
    if (!table.rows.length) continue;
    doc.addPage(); doc.setFontSize(13); doc.text(toTitleCase(table.name), 14, 16);
    const keys = Object.keys(table.rows[0]);
    autoTable(doc, {
      startY: 22,
      head: [keys.map(toTitleCase)],
      body: table.rows.map(row => keys.map(key => String((row as Record<string, unknown>)[key] ?? "Not recorded"))),
      styles: { fontSize: 7, overflow: "linebreak", cellPadding: 2 },
      headStyles: { fillColor: [15, 118, 110] },
      horizontalPageBreak: true,
      horizontalPageBreakRepeat: 0
    });
  }
  doc.addPage(); doc.setFontSize(13); doc.text("Report Definitions and Data Coverage", 14, 16);
  autoTable(doc, { startY: 22, body: report.notes.map(note => [note]), styles: { fontSize: 10, cellPadding: 4 } });
  for (let page = 1; page <= doc.getNumberOfPages(); page++) {
    doc.setPage(page); doc.setFontSize(8); doc.text(`Read-only Trustee Report | ${page} / ${doc.getNumberOfPages()}`, 14, doc.internal.pageSize.getHeight() - 8);
  }
  return doc;
}

export async function exportStudentPdf(report: StudentReport, filters: Record<string, string>) {
  const doc = await createStudentPdf(report, filters);
  doc.save(`trustee-students-${report.to_date}.pdf`);
}

