import type { ResultTemplateId } from "@/lib/result-template";

export interface PDFResultSubject {
  subject: string;
  maximum: string | number;
  obtained: string | number;
  grade?: string | null;
  remarks?: string | null;
  absent?: boolean;
}

export interface PDFStudentInfo {
  id?: string | number;
  name: string;
  rollNumber?: string | number | null;
  admissionNumber?: string | number | null;
  className?: string | null;
  dateOfBirth?: string | null;
  photo?: string | null;
}

export interface PDFSchoolInfo {
  name: string;
  logo?: string;
  address?: string;
  phone?: string;
  email?: string;
  academicYear?: string;
}

export interface PDFTotals {
  maximum: string | number;
  obtained: string | number;
  percentage: string | number;
  grade?: string | null;
}

export interface DownloadResultPDFOptions {
  school: PDFSchoolInfo;
  title: string;
  student: PDFStudentInfo;
  subjects: PDFResultSubject[];
  totals: PDFTotals;
  remarks?: string | null;
  template?: ResultTemplateId;
}

export async function downloadResultReportCardPDF(options: DownloadResultPDFOptions): Promise<void> {
  const [{ default: jsPDF }, { default: autoTable }, QRCode] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
    import("qrcode"),
  ]);

  const { school, title, student, subjects, totals, remarks } = options;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;

  // 1. School Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(20, 38, 77);
  doc.text(school.name || "School", margin, 20);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  let subHeaderY = 25;
  if (school.address) {
    doc.text(school.address, margin, subHeaderY);
    subHeaderY += 4.5;
  }
  const contactParts = [school.phone && `Phone: ${school.phone}`, school.email && `Email: ${school.email}`].filter(Boolean);
  if (contactParts.length) {
    doc.text(contactParts.join(" | "), margin, subHeaderY);
  }

  // Academic Year Badge on top right
  const yearText = school.academicYear || "2026-27";
  doc.setFillColor(238, 242, 255);
  doc.setDrawColor(224, 231, 255);
  doc.roundedRect(pageW - margin - 46, 13, 46, 14, 3, 3, "FD");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Academic Year", pageW - margin - 23, 18, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(37, 99, 235);
  doc.text(yearText, pageW - margin - 23, 24, { align: "center" });

  // 2. Title Banner
  const bannerY = 32;
  doc.setFillColor(239, 246, 255);
  doc.setDrawColor(219, 234, 254);
  doc.roundedRect(margin, bannerY, pageW - 2 * margin, 13, 3, 3, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(30, 64, 175);
  doc.text((title || "EXAMINATION").toUpperCase(), pageW / 2, bannerY + 5.5, { align: "center" });
  doc.setFontSize(7.5);
  doc.setTextColor(59, 130, 246);
  doc.text("RESULT REPORT CARD", pageW / 2, bannerY + 10, { align: "center" });

  // 3. Student Information Card
  const infoY = bannerY + 16;
  const infoH = 32;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, infoY, pageW - 2 * margin, infoH, 3, 3, "FD");

  // Avatar initial block
  doc.setFillColor(238, 242, 255);
  doc.roundedRect(margin + 4, infoY + 4, 24, 24, 3, 3, "F");
  const initial = (student.name || "S").trim().charAt(0).toUpperCase();
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(59, 130, 246);
  doc.text(initial, margin + 16, infoY + 20, { align: "center" });

  // Column 1
  const col1X = margin + 33;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Student Name", col1X, infoY + 8);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(student.name || "—", col1X, infoY + 13);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Admission No.", col1X, infoY + 21);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(String(student.admissionNumber || "—"), col1X, infoY + 26);

  // Column 2
  const col2X = margin + 96;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Roll Number", col2X, infoY + 8);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(String(student.rollNumber || "—"), col2X, infoY + 13);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Class", col2X, infoY + 21);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(student.className || "—", col2X, infoY + 26);

  // QR Code
  try {
    const qrVal = String(student.admissionNumber || student.id || student.name || "STUDENT");
    const qrDataUrl = await QRCode.toDataURL(qrVal, { margin: 1, width: 80 });
    doc.addImage(qrDataUrl, "PNG", pageW - margin - 26, infoY + 3.5, 22, 22);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Student ID`, pageW - margin - 15, infoY + 27.5, { align: "center" });
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    doc.text(String(student.admissionNumber || ""), pageW - margin - 15, infoY + 30.5, { align: "center" });
  } catch {
    // If QR code generation fails, proceed gracefully
  }

  // 4. Subjects Table
  const tableStartY = infoY + infoH + 4;
  const tableBody = subjects.map((sub, idx) => [
    String(idx + 1),
    sub.subject,
    String(sub.maximum),
    sub.absent ? "Absent" : String(sub.obtained),
    sub.grade || "—",
    sub.remarks || "—",
  ]);

  autoTable(doc, {
    startY: tableStartY,
    margin: { left: margin, right: margin },
    head: [["Sr. No.", "Subject", "Max Marks", "Obtained Marks", "Grade", "Remarks"]],
    body: tableBody.length ? tableBody : [["1", "Exam", String(totals.maximum), String(totals.obtained), totals.grade || "—", "—"]],
    theme: "grid",
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8.5,
      halign: "center",
      cellPadding: 2.5,
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 15 },
      1: { halign: "left", fontStyle: "bold" },
      2: { halign: "center", cellWidth: 26 },
      3: { halign: "center", cellWidth: 28, fontStyle: "bold" },
      4: { halign: "center", cellWidth: 22 },
      5: { halign: "center", cellWidth: 30 },
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      textColor: [51, 65, 85],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  const finalY = (doc as any).lastAutoTable?.finalY || 160;

  // 5. Summary Row (4 metric boxes)
  const cardW = (pageW - 2 * margin - 9) / 4;
  const summaryCards = [
    { label: "TOTAL MARKS", value: String(totals.maximum), fill: [243, 232, 255], text: [126, 34, 206] },
    { label: "OBTAINED MARKS", value: String(totals.obtained), fill: [239, 246, 255], text: [29, 78, 216] },
    {
      label: "PERCENTAGE",
      value: typeof totals.percentage === "number" ? `${totals.percentage.toFixed(2)}%` : String(totals.percentage).includes("%") ? String(totals.percentage) : `${totals.percentage}%`,
      fill: [236, 253, 245],
      text: [4, 120, 87],
    },
    { label: "OVERALL GRADE", value: String(totals.grade || "—").toUpperCase(), fill: [254, 243, 199], text: [180, 83, 9] },
  ];

  summaryCards.forEach((c, i) => {
    const x = margin + i * (cardW + 3);
    doc.setFillColor(c.fill[0], c.fill[1], c.fill[2]);
    doc.roundedRect(x, finalY + 4, cardW, 14, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(c.text[0], c.text[1], c.text[2]);
    doc.text(c.label, x + cardW / 2, finalY + 8.5, { align: "center" });
    doc.setFontSize(9.5);
    doc.text(c.value, x + cardW / 2, finalY + 14.5, { align: "center" });
  });

  // 6. Teacher's Remarks Box
  const remY = finalY + 21;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, remY, pageW - 2 * margin, 14, 2, 2, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text("Teacher's Remarks:", margin + 4, remY + 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  const defaultRemark =
    Number(totals.percentage) >= 80
      ? "Student has shown excellent performance in academics. Keep up the good work!"
      : "Student has shown satisfactory academic progress.";
  doc.text(remarks || defaultRemark, margin + 4, remY + 10);

  // 7. Signatures Footer
  const sigY = pageH - 22;
  doc.setDrawColor(148, 163, 184);
  doc.line(margin + 10, sigY, margin + 50, sigY);
  doc.line(pageW - margin - 50, sigY, pageW - margin - 10, sigY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text("Class Teacher", margin + 30, sigY + 4.5, { align: "center" });
  doc.text("Principal", pageW - margin - 30, sigY + 4.5, { align: "center" });

  // 8. Date of Issue
  const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`Date of Issue: ${today}`, margin, pageH - 8);
  doc.text(`Generated by ${school.name || "School"}`, pageW - margin, pageH - 8, { align: "right" });

  // 9. Save file directly
  const safeStudentName = (student.name || "Student").trim().replace(/[^a-zA-Z0-9_-]/g, "_");
  const safeTitle = (title || "Result").trim().replace(/[^a-zA-Z0-9_-]/g, "_");
  const filename = `${safeStudentName}_${safeTitle}_Report_Card.pdf`;
  doc.save(filename);
}

