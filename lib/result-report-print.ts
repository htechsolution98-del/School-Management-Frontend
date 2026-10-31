import QRCode from "qrcode";
import type { ResultTemplateId } from "@/lib/result-template";

export interface PrintableResultSubject {
  subject: string;
  maximum: string | number;
  obtained: string | number;
  grade?: string | null;
  remarks?: string | null;
  absent?: boolean;
}

export interface PrintableResultStudent {
  studentId: string | number;
  name: string;
  rollNumber?: string | number | null;
  admissionNumber?: string | number | null;
  className?: string | null;
  division?: string | null;
  dateOfBirth?: string | null;
  photo?: string | null;
  subjects: PrintableResultSubject[];
  totalMaximum: string | number;
  totalObtained: string | number;
  percentage: string | number;
  overallGrade?: string | null;
  remarks?: string | null;
}

export interface PrintableSchoolBrand {
  name: string;
  logo?: string;
  address?: string;
  phone?: string;
  email?: string;
}

const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;",
}[char] || char));

export async function writePrintableResultCards(args: {
  printWindow: Window;
  students: PrintableResultStudent[];
  school: PrintableSchoolBrand;
  title: string;
  academicYear?: string;
  template: ResultTemplateId;
}) {
  const { printWindow, students, school, title, academicYear, template } = args;
  const accent = template === "modern" ? "#5c28e8" : template === "compact" ? "#0f766e" : template === "watermark" ? "#1d4ed8" : "#17325c";
  const issueDate = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const cards = await Promise.all(students.map(async (student, cardIndex) => {
    const qrValue = String(student.admissionNumber || student.studentId);
    const qr = await QRCode.toDataURL(qrValue, { errorCorrectionLevel: "M", margin: 1, width: 220 });
    const rows = student.subjects.map((subject, index) => `<tr>
      <td class="center">${index + 1}</td><td>${escapeHtml(subject.subject)}</td><td class="center">${escapeHtml(subject.maximum)}</td>
      <td class="center strong">${subject.absent ? "Absent" : escapeHtml(subject.obtained)}</td>
      <td class="center"><span class="grade">${escapeHtml(subject.grade || "—")}</span></td><td>${escapeHtml(subject.remarks || "—")}</td>
    </tr>`).join("");
    const studentName = escapeHtml(student.name || "Student");
    const initial = escapeHtml((student.name || "S").trim().charAt(0).toUpperCase() || "S");
    const classLine = [student.className, student.division].filter(Boolean).join(" - ");
    return `<article class="sheet theme-${template}">
      ${school.logo ? `<img class="watermark" src="${escapeHtml(school.logo)}" alt="">` : ""}
      <header class="school-header">
        ${school.logo ? `<img class="school-logo" src="${escapeHtml(school.logo)}" alt="School logo">` : `<div class="school-mark">${escapeHtml(school.name.charAt(0) || "S")}</div>`}
        <div class="school-copy"><h1>${escapeHtml(school.name || "School")}</h1>${school.address ? `<p>${escapeHtml(school.address)}</p>` : ""}${school.phone ? `<p>Phone: ${escapeHtml(school.phone)}</p>` : ""}${school.email ? `<p>Email: ${escapeHtml(school.email)}</p>` : ""}</div>
        ${academicYear ? `<div class="year"><span>Academic Year</span><strong>${escapeHtml(academicYear)}</strong></div>` : ""}
      </header>
      <section class="title-band"><h2>${escapeHtml(title)}</h2><span>RESULT REPORT CARD</span></section>
      <section class="student-panel">
        <div class="portrait">${student.photo ? `<img src="${escapeHtml(student.photo)}" alt="${studentName}">` : `<span>${initial}</span>`}</div>
        <div class="student-fields">
          <div><span>Student Name</span><strong>${studentName}</strong></div>
          <div><span>Roll Number</span><strong>${escapeHtml(student.rollNumber || "—")}</strong></div>
          <div><span>Admission No.</span><strong>${escapeHtml(student.admissionNumber || "—")}</strong></div>
          <div><span>Class</span><strong>${escapeHtml(classLine || "—")}</strong></div>
          ${student.dateOfBirth ? `<div><span>Date of Birth</span><strong>${escapeHtml(student.dateOfBirth)}</strong></div>` : ""}
        </div>
        <div class="student-qr"><img src="${qr}" alt="Student ID QR code"><span>Student ID</span><strong>${escapeHtml(student.admissionNumber || student.studentId)}</strong></div>
      </section>
      <table class="marks"><thead><tr><th>Sr. No.</th><th>Subject</th><th>Max Marks</th><th>Obtained Marks</th><th>Grade</th><th>Remarks</th></tr></thead><tbody>${rows || `<tr><td colspan="6" class="center">No published marks available.</td></tr>`}</tbody></table>
      <section class="summary">
        <div class="total"><span>Total Marks</span><strong>${escapeHtml(student.totalMaximum)}</strong></div>
        <div class="obtained"><span>Obtained Marks</span><strong>${escapeHtml(student.totalObtained)}</strong></div>
        <div class="percentage"><span>Percentage</span><strong>${escapeHtml(student.percentage)}%</strong></div>
        <div class="overall-grade"><span>Overall Grade</span><strong>${escapeHtml(student.overallGrade || "—")}</strong></div>
      </section>
      ${student.remarks ? `<section class="remarks"><b>Teacher's Remarks</b><p>${escapeHtml(student.remarks)}</p></section>` : ""}
      <footer><div class="signature">Class Teacher</div>${school.logo ? `<img class="seal" src="${escapeHtml(school.logo)}" alt="School seal">` : `<div class="seal"></div>`}<div class="signature">Principal</div></footer>
      <div class="issue-row"><span>Date of Issue: ${escapeHtml(issueDate)}</span><span>${cardIndex + 1} / ${students.length}</span></div>
    </article>`;
  }));

  const background = template === "modern" ? "#eef2ff" : template === "watermark" ? "#eff6ff" : "#eaf2ff";
  printWindow.document.open();
  printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(school.name)} · ${escapeHtml(title)} · Result</title><style>
    @page{size:A4;margin:0}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}html,body{margin:0;width:100%;min-height:100%;padding:0;background:#eef4ff;color:#172554;font-family:Arial,sans-serif}.sheet{--accent:${accent};position:relative;width:210mm;height:296mm;margin:0 auto;padding:10mm 10mm 12mm;border:1px solid #e2eaf7;border-radius:4mm;background:#fff;overflow:hidden;page-break-after:auto;break-after:auto;page-break-inside:avoid}.sheet:not(:last-of-type){page-break-after:always;break-after:page}.school-header{position:relative;z-index:1;display:flex;align-items:center;gap:5mm;padding:2mm 3mm 4mm}.school-logo,.school-mark{width:18mm;height:18mm;object-fit:contain;flex:none}.school-mark{display:flex;align-items:center;justify-content:center;border-radius:50%;background:#eaf3ff;color:var(--accent);font-size:18pt;font-weight:bold}.school-copy{min-width:0;flex:1}.school-copy h1{margin:0 0 1.5mm;color:#102757;font-size:17pt;font-weight:800}.school-copy p{margin:.5mm 0;color:#687a9a;font-size:8pt}.year{min-width:32mm;padding:3mm;text-align:center;border-radius:3mm;background:#eaf3ff;color:#17325c}.year span,.year strong{display:block}.year span{font-size:8pt}.year strong{margin-top:1mm;font-size:11pt}.title-band{position:relative;z-index:1;margin:2mm 0 4mm;padding:3mm;text-align:center;border-radius:3mm;background:${background};color:var(--accent)}.title-band h2{margin:0 0 1mm;font-size:16pt;font-weight:800;letter-spacing:.5mm;text-transform:uppercase}.title-band span{font-size:8pt;font-weight:bold;letter-spacing:2mm}.student-panel{position:relative;z-index:1;display:grid;grid-template-columns:36mm 1fr 27mm;align-items:center;gap:4mm;margin-bottom:5mm;padding:3mm;border:1px solid #e0e9f7;border-radius:3mm;background:#fff}.portrait{width:34mm;height:36mm;display:flex;align-items:center;justify-content:center;overflow:hidden;border-radius:3mm;background:linear-gradient(135deg,#e0efff,#eff6ff)}.portrait img{width:100%;height:100%;object-fit:cover}.portrait span{font-size:28pt;font-weight:bold;color:#2563eb}.student-fields{display:grid;grid-template-columns:1fr 1fr;gap:2mm 4mm;min-width:0}.student-fields div{min-width:0;display:grid;grid-template-columns:24mm 1fr;align-items:baseline;gap:1.5mm}.student-fields span{color:#596b8b;font-size:8pt}.student-fields strong{color:#14264d;font-size:9pt;overflow-wrap:anywhere}.student-qr{display:flex;flex-direction:column;align-items:center;text-align:center;gap:.8mm}.student-qr img{width:24mm;height:24mm;object-fit:contain;border:1px solid #e0e9f7;border-radius:2mm;padding:1mm}.student-qr span{font-size:7pt;color:#596b8b}.student-qr strong{font-size:7pt;overflow-wrap:anywhere}.marks{position:relative;z-index:1;width:100%;border:1px solid #dce7f6;border-collapse:collapse}.marks th{padding:2.5mm 1.5mm;background:#e9f2ff;color:#142e62;font-size:8pt;text-align:center}.marks td{padding:2.5mm 1.5mm;border-top:1px solid #e2eaf5;color:#263957;font-size:8.5pt}.marks td:nth-child(1),.marks td:nth-child(3),.marks td:nth-child(4),.marks td:nth-child(5){text-align:center}.marks .strong{font-weight:bold}.grade{display:inline-block;min-width:12mm;padding:1mm 2mm;border-radius:5mm;background:#dcfce7;color:#087443;font-weight:bold}.summary{position:relative;z-index:1;display:grid;grid-template-columns:repeat(4,1fr);gap:2mm;margin-top:4mm}.summary div{min-height:19mm;padding:2.5mm;border-radius:3mm;display:flex;flex-direction:column;justify-content:center;gap:1.5mm}.summary span{font-size:7.5pt;color:#344866}.summary strong{font-size:13pt;color:#14264d}.summary .total{background:#f1edff}.summary .obtained{background:#eaf4ff}.summary .percentage{background:#e9fbf1}.summary .overall-grade{background:#fff8df}.remarks{position:relative;z-index:1;min-height:22mm;margin-top:4mm;padding:3mm;border:1px solid #e0e9f7;border-radius:3mm}.remarks b{font-size:9pt;color:#14264d}.remarks p{margin:1.5mm 0 0;color:#344866;font-size:9pt}.sheet footer{position:absolute;z-index:1;left:14mm;right:14mm;bottom:22mm;display:flex;align-items:flex-end;justify-content:space-around}.signature{width:30%;padding-top:2mm;border-top:1px solid #23375f;text-align:center;color:#14264d;font-size:8pt;font-weight:bold}.seal{width:22mm;height:22mm;object-fit:contain}.issue-row{position:absolute;left:10mm;right:10mm;bottom:8mm;display:flex;justify-content:space-between;padding-top:2mm;border-top:1px solid #dce7f6;color:#536684;font-size:7pt}.watermark{position:absolute;z-index:0;left:50%;top:52%;width:110mm;height:110mm;object-fit:contain;transform:translate(-50%,-50%);opacity:${template === "watermark" ? ".06" : "0"}}.theme-modern{--accent:#5c28e8;border:2px solid #ddd6fe}.theme-compact{padding:8mm}.theme-compact .marks th,.theme-compact .marks td{padding:1.5mm}.theme-watermark{--accent:#1d4ed8;border:2px solid #bfdbfe}
    </style></head><body>${cards}<script>window.onload=function(){setTimeout(function(){window.focus();window.print()},500)};window.onafterprint=function(){window.close()}</script></body></html>`);
  printWindow.document.close();
}
