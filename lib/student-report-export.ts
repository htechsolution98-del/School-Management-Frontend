import type { StudentReport } from "@/lib/trustee-student-report";

function tables(report: StudentReport) {
  return [
    { name: "Summary", rows: Object.entries(report.summary).map(([metric, value]) => ({ metric, value })) },
    { name: "Students", rows: report.students.results }, { name: "Class strength", rows: report.class_strength },
    { name: "Division strength", rows: report.division_strength }, { name: "Gender", rows: report.gender },
    { name: "Categories", rows: report.categories }, { name: "Student status", rows: report.status },
    { name: "Academic year participation", rows: report.enrollment_trends }, { name: "New admissions by year", rows: report.admission_trends },
    { name: "Daily attendance", rows: report.attendance }, { name: "Monthly collections", rows: report.collections },
    { name: "Exam summary", rows: report.exams }, { name: "Exam result records", rows: report.result_records },
    { name: "Fee ledger", rows: report.fee_records },
  ] as { name: string; rows: object[] }[];
}
function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; anchor.click(); URL.revokeObjectURL(url);
}
const label = (value: string) => value.replaceAll("_", " ");

export async function createStudentExcelBuffer(report: StudentReport, filters: Record<string, string>) {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "School Trustee Reports";
  const context = workbook.addWorksheet("Report context");
  context.addRows([["School", report.school], ["Generated", report.generated_at], ["Date from", report.from_date || "All recorded dates"], ["Date to", report.to_date], ...Object.entries(filters).filter(([, value]) => value), ...report.notes.map(note => ["Definition", note])]);
  context.getColumn(1).width = 25; context.getColumn(2).width = 110;
  context.getColumn(2).alignment = { wrapText: true, vertical: "top" };
  for (const table of tables(report)) {
    const sheet = workbook.addWorksheet(table.name.slice(0, 31));
    if (!table.rows.length) { sheet.addRow(["No records for this selection"]); continue; }
    const keys = Object.keys(table.rows[0]);
    sheet.columns = keys.map(key => ({ header: label(key), key, width: key.includes("name") || key === "title" ? 30 : 20 }));
    for (const row of table.rows) {
      // Plain string values are written as strings, never as formula objects.
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
  doc.setFontSize(9); doc.text(`Generated ${report.generated_at} | ${report.from_date || "All recorded dates"} to ${report.to_date}`, 14, 25);
  doc.text(doc.splitTextToSize(`Filters: ${Object.entries(filters).filter(([, value]) => value).map(([key, value]) => `${label(key)}=${value}`).join(", ") || "All students"}`, 385), 14, 31);
  autoTable(doc, { startY: 45, head: [["Metric", "Value"]], body: Object.entries(report.summary).map(([key, value]) => [label(key), String(value ?? "Not available")]), styles: { fontSize: 9 }, headStyles: { fillColor: [15, 118, 110] } });
  // Split wide student details into readable sections, all linked by student ID.
  const studentSections = [
    ["id", "name", "gr_no", "roll_no", "class_name", "division", "academic_year", "is_active", "student_status", "gender", "category", "is_rte", "admission_date", "leaving_date"],
    ["id", "name", "present", "absent", "unmarked", "attendance_percentage", "exam_percentage", "graded_results", "final_percentage", "final_grade", "final_year"],
    ["id", "name", "payable", "credited_paid", "pending", "overdue_due", "govt_pending", "student_collection", "government_collection"],
    ["id", "name", "date_of_birth", "father_name", "mother_name", "mobile"],
  ];
  const rest = tables(report).filter(table => !["Summary", "Students"].includes(table.name));
  const sections = [...studentSections.map((keys, index) => ({ name: `Students - ${["Profile", "Attendance & performance", "Fees", "Contact"][index]}`, rows: report.students.results.map(row => Object.fromEntries(keys.map(key => [key, row[key as keyof typeof row]]))) })), ...rest];
  for (const table of sections) {
    if (!table.rows.length) continue;
    doc.addPage(); doc.setFontSize(13); doc.text(table.name, 14, 16);
    const keys = Object.keys(table.rows[0]);
    autoTable(doc, { startY: 22, head: [keys.map(label)], body: table.rows.map(row => keys.map(key => String((row as Record<string, unknown>)[key] ?? "Not recorded"))), styles: { fontSize: 7, overflow: "linebreak", cellPadding: 2 }, headStyles: { fillColor: [15, 118, 110] }, horizontalPageBreak: true, horizontalPageBreakRepeat: 0 });
  }
  doc.addPage(); doc.setFontSize(13); doc.text("Report definitions and data coverage", 14, 16);
  autoTable(doc, { startY: 22, body: report.notes.map(note => [note]), styles: { fontSize: 10, cellPadding: 4 } });
  for (let page = 1; page <= doc.getNumberOfPages(); page++) { doc.setPage(page); doc.setFontSize(8); doc.text(`Read-only Trustee report | ${page} / ${doc.getNumberOfPages()}`, 14, doc.internal.pageSize.getHeight() - 8); }
  return doc;
}

export async function exportStudentPdf(report: StudentReport, filters: Record<string, string>) {
  const doc = await createStudentPdf(report, filters);
  doc.save(`trustee-students-${report.to_date}.pdf`);
}
