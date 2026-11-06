import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { PayrollPayslip } from "@/types/hr-config";

function formatCurrencyINR(val: string | number): string {
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num)) return "0.00";
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

function formatMonthYear(dateStr?: string): string {
  if (!dateStr) return "Current Cycle";
  try {
    const parts = dateStr.split("-");
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const date = new Date(year, month - 1, 1);
    return date.toLocaleDateString("en-IN", {
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function numberToWordsINR(amount: number): string {
  if (amount <= 0) return "Zero Rupees Only";
  const singleDigits = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen",
  ];
  const tensDigits = [
    "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
  ];

  function convertTwoDigits(num: number): string {
    if (num === 0) return "";
    if (num < 20) return singleDigits[num];
    const tens = Math.floor(num / 10);
    const ones = num % 10;
    return `${tensDigits[tens]}${ones > 0 ? " " + singleDigits[ones] : ""}`;
  }

  function convertThreeDigits(num: number): string {
    const hundreds = Math.floor(num / 100);
    const remainder = num % 100;
    const strHundreds = hundreds > 0 ? `${singleDigits[hundreds]} Hundred` : "";
    const strRemainder = convertTwoDigits(remainder);
    if (strHundreds && strRemainder) return `${strHundreds} ${strRemainder}`;
    return strHundreds || strRemainder;
  }

  const intAmount = Math.floor(amount);
  const paise = Math.round((amount - intAmount) * 100);

  const crores = Math.floor(intAmount / 10000000);
  let rem = intAmount % 10000000;
  const lakhs = Math.floor(rem / 100000);
  rem = rem % 100000;
  const thousands = Math.floor(rem / 1000);
  rem = rem % 1000;
  const hundreds = rem;

  const parts: string[] = [];
  if (crores > 0) parts.push(`${convertTwoDigits(crores)} Crore`);
  if (lakhs > 0) parts.push(`${convertTwoDigits(lakhs)} Lakh`);
  if (thousands > 0) parts.push(`${convertTwoDigits(thousands)} Thousand`);
  if (hundreds > 0) parts.push(convertThreeDigits(hundreds));

  let words = `Rupees ${parts.join(" ")}`;
  if (paise > 0) {
    words += ` and ${convertTwoDigits(paise)} Paise`;
  }
  return `${words} Only`.trim();
}

/**
 * Loads an image from URL and converts it to Base64 PNG for jsPDF embedding
 */
async function loadImageAsBase64(
  url: string
): Promise<{ data: string; width: number; height: number } | null> {
  return new Promise((resolve) => {
    if (!url || typeof window === "undefined") return resolve(null);
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const w = img.naturalWidth || img.width || 120;
          const h = img.naturalHeight || img.height || 60;
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (!ctx) return resolve(null);
          ctx.drawImage(img, 0, 0, w, h);
          const dataURL = canvas.toDataURL("image/png");
          resolve({ data: dataURL, width: w, height: h });
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = url;
    } catch {
      resolve(null);
    }
  });
}

export async function downloadPayslipPdf(
  payslip: PayrollPayslip,
  schoolName?: string,
  schoolLogo?: string
): Promise<void> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182mm

  // 1. Resolve Display Info
  const resolvedSchool =
    schoolName ||
    payslip.school_name ||
    (typeof window !== "undefined"
      ? localStorage.getItem("school_full_name") ||
        localStorage.getItem("school_name") ||
        "School Management"
      : "School Management");

  const resolvedLogoUrl =
    schoolLogo ||
    (payslip as any).school_logo ||
    (typeof window !== "undefined" ? localStorage.getItem("school_logo") || "" : "");

  const staffName = payslip.staff_name || `Staff #${payslip.staff}`;
  const staffRole = payslip.designation || payslip.staff_category || "Staff";
  const department = payslip.department || "General";
  const salaryMonth = payslip.salary_month || "";
  const monthDisplay = formatMonthYear(salaryMonth);
  const receiptNo = payslip.receipt_number || `SAL-${salaryMonth}-${payslip.id || payslip.staff}`;

  // Breakdown calculations
  const breakdown = (payslip.component_breakdown || {}) as Record<string, any>;
  const totalDays = Number(
    breakdown.working_days ||
      (payslip as any).working_days ||
      (payslip as any).total_working_days ||
      30
  );
  const presentDays = Number(breakdown.present_days ?? (payslip as any).present_days ?? 0);
  const paidLeaves = Number(breakdown.paid_leaves ?? (payslip as any).paid_leaves ?? 0);
  const unpaidLeaves = Number(breakdown.unpaid_leaves ?? (payslip as any).unpaid_leaves ?? 0);
  const payableDays =
    breakdown.payable_days != null
      ? Number(breakdown.payable_days)
      : Math.max(0, totalDays - unpaidLeaves);

  const earningsList: { name: string; amount: number }[] = [];
  if (Array.isArray(breakdown.earnings) && breakdown.earnings.length > 0) {
    breakdown.earnings.forEach((e: any) => {
      earningsList.push({ name: e.name, amount: Number(e.amount || 0) });
    });
  } else {
    earningsList.push({
      name: "Basic Salary",
      amount: Number(payslip.basic_salary || payslip.gross_earnings || 0),
    });
  }

  const deductionsList: { name: string; amount: number }[] = [];
  if (Array.isArray(breakdown.deductions) && breakdown.deductions.length > 0) {
    breakdown.deductions.forEach((d: any) => {
      deductionsList.push({ name: d.name, amount: Number(d.amount || 0) });
    });
  }

  const grossEarnings =
    Number(payslip.gross_earnings) > 0
      ? Number(payslip.gross_earnings)
      : earningsList.reduce((acc, curr) => acc + curr.amount, 0);

  const totalDeductions =
    Number(payslip.total_deductions) > 0
      ? Number(payslip.total_deductions)
      : deductionsList.reduce((acc, curr) => acc + curr.amount, 0);

  const netSalary =
    Number(payslip.net_salary) > 0
      ? Number(payslip.net_salary)
      : Math.max(0, grossEarnings - totalDeductions);

  let curY = 14;

  // ── 2. Top Decorative Accent Bar ──
  doc.setFillColor(30, 58, 138); // Deep Navy (#1e3a8a)
  doc.rect(margin, curY, contentWidth, 1.2, "F");
  curY += 5;

  // ── 3. Letterhead with Logo and School Info ──
  let textStartX = margin;
  if (resolvedLogoUrl) {
    const loadedLogo = await loadImageAsBase64(resolvedLogoUrl);
    if (loadedLogo) {
      const maxLogoW = 30;
      const maxLogoH = 13;
      const scale = Math.min(maxLogoW / loadedLogo.width, maxLogoH / loadedLogo.height);
      const renderW = loadedLogo.width * scale;
      const renderH = loadedLogo.height * scale;
      doc.addImage(loadedLogo.data, "PNG", margin, curY, renderW, renderH);
      textStartX = margin + renderW + 4;
    }
  }

  // School Name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(30, 58, 138);
  doc.text(resolvedSchool.toUpperCase(), textStartX, curY + 5);

  // Statement Subtitle
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Official Staff Payroll & Compensation Statement", textStartX, curY + 10.5);

  // Top-Right Metadata (Receipt # & Month)
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(51, 65, 85);
  doc.text(`RECEIPT: ${receiptNo}`, pageWidth - margin, curY + 4, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text(`Salary Month: ${monthDisplay}`, pageWidth - margin, curY + 9.5, { align: "right" });

  curY += 15;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(margin, curY, pageWidth - margin, curY);
  curY += 3.5;

  // ── 4. Staff & Payment Metadata Box ──
  const metaBoxHeight = 24;
  doc.setFillColor(248, 250, 252); // slate-50
  doc.roundedRect(margin, curY, contentWidth, metaBoxHeight, 2, 2, "F");
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, curY, contentWidth, metaBoxHeight, 2, 2, "S");

  const col1 = margin + 4;
  const col2 = margin + 50;
  const col3 = margin + 98;
  const col4 = margin + 144;

  let rowY = curY + 5;

  // Row 1: Labels
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 116, 139);
  doc.text("Employee Name:", col1, rowY);
  doc.text("Staff ID / Code:", col2, rowY);
  doc.text("Designation / Role:", col3, rowY);
  doc.text("Department:", col4, rowY);

  // Row 1: Values
  rowY += 4.5;
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(staffName, col1, rowY);
  doc.text(`EMP-${payslip.staff}`, col2, rowY);
  doc.text(staffRole, col3, rowY);
  doc.text(department, col4, rowY);

  rowY += 6;

  // Row 2: Labels
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 116, 139);
  doc.text("Payment Mode:", col1, rowY);
  doc.text("Payment Date:", col2, rowY);
  doc.text("Disbursement Status:", col3, rowY);
  doc.text("Receipt Ref:", col4, rowY);

  // Row 2: Values
  rowY += 4.5;
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text((payslip.payment_mode || "Direct / Cash").toUpperCase(), col1, rowY);
  const pDateStr = payslip.payment_date
    ? new Date(payslip.payment_date).toLocaleDateString("en-IN")
    : payslip.created_at
    ? new Date(payslip.created_at).toLocaleDateString("en-IN")
    : "—";
  doc.text(pDateStr, col2, rowY);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(5, 150, 105); // emerald-600
  doc.text(payslip.payment_status === "paid" ? "Paid & Reconciled" : "Disbursed", col3, rowY);
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "normal");
  doc.text(receiptNo, col4, rowY);

  curY += metaBoxHeight + 4;

  // ── 5. Attendance & Duty Summary Table ──
  autoTable(doc, {
    startY: curY,
    margin: { left: margin, right: margin },
    head: [["Total Days in Cycle", "Present Days", "Paid Leaves", "Unpaid / LOP", "Payable Days"]],
    body: [[String(totalDays), String(presentDays), String(paidLeaves), String(unpaidLeaves), String(payableDays)]],
    theme: "grid",
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [51, 65, 85],
      fontSize: 8,
      fontStyle: "bold",
      halign: "center",
      cellPadding: 2,
    },
    bodyStyles: {
      fontSize: 9,
      fontStyle: "bold",
      textColor: [15, 23, 42],
      halign: "center",
      cellPadding: 2.5,
    },
  });

  curY = (doc as any).lastAutoTable.finalY + 4;

  // ── 6. Earnings & Deductions Tables (Side by Side) ──
  // Note: Using Rs. instead of ₹ to ensure 100% clean rendering in standard PDF fonts
  const halfWidth = (contentWidth - 4) / 2;

  // Earnings Table Data
  const earningsBody = earningsList.map((e) => [e.name, `Rs. ${formatCurrencyINR(e.amount)}`]);
  earningsBody.push(["Gross Earnings", `Rs. ${formatCurrencyINR(grossEarnings)}`]);

  autoTable(doc, {
    startY: curY,
    margin: { left: margin, right: pageWidth - margin - halfWidth },
    tableWidth: halfWidth,
    head: [["EARNINGS & ALLOWANCES", "AMOUNT (Rs.)"]],
    body: earningsBody,
    theme: "striped",
    headStyles: {
      fillColor: [16, 185, 129], // Emerald
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: "bold",
      cellPadding: 2.5,
    },
    columnStyles: {
      0: { cellWidth: halfWidth - 32, fontSize: 8 },
      1: { cellWidth: 32, halign: "right", fontStyle: "bold", fontSize: 8 },
    },
    didParseCell: (data) => {
      if (data.row.index === earningsBody.length - 1) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [236, 253, 245];
        data.cell.styles.textColor = [4, 120, 87];
      }
    },
  });

  const earningsFinalY = (doc as any).lastAutoTable.finalY;

  // Deductions Table Data
  const deductionsBody =
    deductionsList.length > 0
      ? deductionsList.map((d) => [d.name, `Rs. ${formatCurrencyINR(d.amount)}`])
      : [["No Deductions Applied", "Rs. 0.00"]];
  deductionsBody.push(["Total Deductions", `Rs. ${formatCurrencyINR(totalDeductions)}`]);

  autoTable(doc, {
    startY: curY,
    margin: { left: margin + halfWidth + 4, right: margin },
    tableWidth: halfWidth,
    head: [["DEDUCTIONS & RECOVERIES", "AMOUNT (Rs.)"]],
    body: deductionsBody,
    theme: "striped",
    headStyles: {
      fillColor: [225, 29, 72], // Rose
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: "bold",
      cellPadding: 2.5,
    },
    columnStyles: {
      0: { cellWidth: halfWidth - 32, fontSize: 8 },
      1: { cellWidth: 32, halign: "right", fontStyle: "bold", fontSize: 8 },
    },
    didParseCell: (data) => {
      if (data.row.index === deductionsBody.length - 1) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [255, 241, 242];
        data.cell.styles.textColor = [190, 18, 60];
      }
    },
  });

  const deductionsFinalY = (doc as any).lastAutoTable.finalY;
  curY = Math.max(earningsFinalY, deductionsFinalY) + 5;

  // ── 7. Net Take-Home Salary Banner (No Text Overflow) ──
  const bannerHeight = 20;
  doc.setFillColor(30, 58, 138); // Deep Navy (#1e3a8a)
  doc.roundedRect(margin, curY, contentWidth, bannerHeight, 2, 2, "F");

  // Left Column inside Banner: Label and Big Amount
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(191, 219, 254); // Blue 200
  doc.text("NET TAKE-HOME SALARY PAYABLE", margin + 6, curY + 6.5);

  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text(`Rs. ${formatCurrencyINR(netSalary)}`, margin + 6, curY + 14.5);

  // Right Column inside Banner: Stacked Gross and Deductions
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(255, 255, 255);
  doc.text(
    `Total Gross Earnings: Rs. ${formatCurrencyINR(grossEarnings)}`,
    pageWidth - margin - 6,
    curY + 7,
    { align: "right" }
  );
  doc.setTextColor(254, 202, 202); // Rose 200
  doc.text(
    `Total Deductions: - Rs. ${formatCurrencyINR(totalDeductions)}`,
    pageWidth - margin - 6,
    curY + 13.5,
    { align: "right" }
  );

  curY += bannerHeight + 4;

  // ── 8. Amount in Words Box ──
  const wordsBoxHeight = 9;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, curY, contentWidth, wordsBoxHeight, 1.5, 1.5, "F");
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, curY, contentWidth, wordsBoxHeight, 1.5, 1.5, "S");

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Amount in Words:", margin + 4, curY + 5.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(numberToWordsINR(netSalary), margin + 31, curY + 5.5);

  curY += wordsBoxHeight + 14;

  // ── 9. Official Signatures & Verification ──
  const sigLineY = curY;

  // Employee Signature
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.4);
  doc.line(margin + 6, sigLineY, margin + 55, sigLineY);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Employee Signature", margin + 14, sigLineY + 4.5);

  // Accounts Officer Signature
  doc.line(pageWidth / 2 - 25, sigLineY, pageWidth / 2 + 25, sigLineY);
  doc.text("Accounts Officer / Clerk", pageWidth / 2 - 18, sigLineY + 4.5);

  // Authorized Signatory
  doc.line(pageWidth - margin - 55, sigLineY, pageWidth - margin - 6, sigLineY);
  doc.text("Authorized Signatory (Trustee)", pageWidth - margin - 50, sigLineY + 4.5);

  // Bottom Security Note
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184);
  doc.text(
    `This is a system-generated official payroll record. Generated on ${new Date().toLocaleDateString("en-IN")}.`,
    pageWidth / 2,
    sigLineY + 12,
    { align: "center" }
  );

  // ── 10. Save PDF Directly ──
  const safeStaffName = staffName.replace(/[^a-zA-Z0-9]/g, "_");
  const fileName = `Payslip_${safeStaffName}_${salaryMonth || "statement"}.pdf`;
  doc.save(fileName);
}
