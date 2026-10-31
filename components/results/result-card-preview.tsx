"use client";

import { useEffect, useState } from "react";
import { Award, BarChart3, CheckCircle2, FileText, Percent, Trophy, UserRound } from "lucide-react";
import QRCode from "qrcode";
import { API_BASE_URL } from "@/lib/config";
import type { ResultTemplateId } from "@/lib/result-template";

export interface ResultCardSubject {
  subject: string;
  maximum: string | number;
  obtained: string | number;
  grade?: string | null;
  remarks?: string | null;
  absent?: boolean;
}

export interface ResultCardPreviewProps {
  title: string;
  template?: ResultTemplateId;
  school: {
    name?: string;
    shortName?: string;
    logo?: string;
    tagline?: string;
    address?: string;
    phone?: string;
    email?: string;
    academicYear?: string;
    establishmentYear?: string;
    boardAffiliation?: string;
    schoolCode?: string;
    udiseCode?: string;
    principalName?: string;
    teacherName?: string;
    stamp?: string;
    principalSignature?: string;
    teacherSignature?: string;
  };
  student: {
    id?: string | number;
    name?: string;
    fatherName?: string;
    motherName?: string;
    rollNumber?: string | number;
    admissionNumber?: string | number;
    className?: string;
    section?: string;
    dateOfBirth?: string;
    photo?: string;
  };
  subjects: ResultCardSubject[];
  totals: { maximum: string | number; obtained: string | number; percentage: string | number; grade?: string | null };
  remarks?: string | null;
}

function mediaUrl(value?: string) {
  if (!value) return "";
  return value.startsWith("http") || value.startsWith("data:")
    ? value
    : `${API_BASE_URL.replace(/\/api\/?$/, "")}${value.startsWith("/") ? value : `/${value}`}`;
}

function StudentQr({ value }: { value: string }) {
  const [source, setSource] = useState("");
  useEffect(() => {
    let active = true;
    if (!value) { setSource(""); return; }
    QRCode.toDataURL(value, { errorCorrectionLevel: "M", margin: 1, width: 180 })
      .then((url) => { if (active) setSource(url); })
      .catch(() => { if (active) setSource(""); });
    return () => { active = false; };
  }, [value]);
  return source ? <img src={source} alt="Student ID QR code" className="h-16 w-16 object-contain sm:h-20 sm:w-20" /> : <div className="h-16 w-16 sm:h-20 sm:w-20" />;
}

function Metric({ icon: Icon, label, value, color }: { icon: typeof Award; label: string; value: string | number; color: "purple" | "blue" | "green" | "gold" }) {
  const styles = {
    purple: "border-violet-200 bg-violet-50 text-violet-800",
    blue: "border-sky-200 bg-sky-50 text-sky-800",
    green: "border-emerald-200 bg-emerald-50 text-emerald-800",
    gold: "border-amber-200 bg-amber-50 text-amber-800",
  }[color];
  const iconStyles = {
    purple: "bg-violet-500 text-white",
    blue: "bg-sky-500 text-white",
    green: "bg-emerald-500 text-white",
    gold: "bg-amber-500 text-white",
  }[color];
  return <div className={`flex min-w-0 items-center gap-2 rounded-lg border p-2 sm:gap-3 sm:p-3 ${styles}`}>
    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md sm:h-10 sm:w-10 ${iconStyles}`}><Icon size={18} /></span>
    <span className="min-w-0"><span className="block text-[11px] font-bold uppercase tracking-wide sm:text-[11px]">{label}</span><strong className="block break-words text-xs sm:text-base">{value}</strong></span>
  </div>;
}

export function ResultCardPreview({ title, template = "classic", school, student, subjects, totals, remarks }: ResultCardPreviewProps) {
  const schoolName = school.name || "School";
  const studentName = student.name || "Student";
  const studentId = String(student.admissionNumber || student.id || "");
  const logo = mediaUrl(school.logo);
  const photo = mediaUrl(student.photo);
  const teacherSignature = mediaUrl(school.teacherSignature);
  const principalSignature = mediaUrl(school.principalSignature);
  const stamp = mediaUrl(school.stamp);
  const accent = template === "modern" ? "#5c28e8" : template === "compact" ? "#0f766e" : template === "watermark" ? "#1d4ed8" : "#17325c";
  const tint = template === "modern" ? "#f1edff" : template === "compact" ? "#e8f7f5" : "#eaf3ff";
  const isModern = template === "modern";
  const isCompact = template === "compact";
  const isWatermark = template === "watermark";
  const headerText = isModern ? "#ffffff" : accent;
  const percentage = Number(totals.percentage) || 0;
  const issueDate = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  return <article data-result-card-preview="true" data-result-template={template} className={`relative isolate mx-auto flex ${isCompact ? "min-h-[850px] sm:min-h-[900px]" : "min-h-[980px] sm:min-h-[1048px]"} w-full max-w-[740px] flex-col overflow-hidden border bg-white ${isModern ? "rounded-xl p-3 sm:p-5" : "p-4 sm:p-7"} text-slate-900 shadow-sm`} style={{ fontFamily: "Georgia, 'Times New Roman', serif", borderColor: `${accent}45`, borderWidth: isModern ? 2 : 1, backgroundImage: isWatermark && logo ? `linear-gradient(rgba(255,255,255,.89),rgba(255,255,255,.89)),url("${logo}")` : undefined, backgroundPosition: "center, center 48%", backgroundRepeat: "no-repeat", backgroundSize: "auto, 86% auto" }}>
    <header className={`relative z-10 grid grid-cols-[64px_minmax(0,1fr)_82px] items-center gap-2 border-b-2 pb-3 sm:grid-cols-[96px_minmax(0,1fr)_112px] sm:gap-4 sm:pb-4 ${isModern ? "rounded-lg px-2 pt-2" : ""}`} style={{ borderColor: accent, ...(isModern ? { backgroundColor: accent, color: "white" } : {}) }}>
      <div className="flex h-16 w-16 items-center justify-center sm:h-24 sm:w-24">{logo ? <img src={logo} alt={`${schoolName} logo`} className="max-h-full max-w-full object-contain" /> : <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 text-xl font-bold" style={{ color: accent, borderColor: accent }}>{schoolName.charAt(0)}</span>}</div>
      <div className="min-w-0 text-center">
        <h1 className="break-words text-sm font-black uppercase leading-tight sm:text-xl" style={{ color: headerText }}>{schoolName}</h1>
        {school.address && <p className={`mt-0.5 text-[11px] leading-tight sm:text-[11px] ${isModern ? "text-white/90" : "text-slate-700"}`}>{school.address}</p>}
        {school.tagline && <p className={`text-[11px] leading-tight sm:text-[11px] ${isModern ? "text-white/90" : "text-slate-700"}`}>{school.tagline}</p>}
        {school.boardAffiliation && <p className={`text-[11px] leading-tight sm:text-[11px] ${isModern ? "text-white/90" : "text-slate-700"}`}>{school.boardAffiliation}</p>}
        <p className="text-[11px] leading-tight text-slate-600 sm:text-[12px]">School Code: {school.schoolCode || "—"} <span className="px-1">|</span> UDISE: {school.udiseCode || "—"}</p>
        {school.establishmentYear && <p className={`text-[11px] leading-tight sm:text-[12px] ${isModern ? "text-white/90" : "text-slate-600"}`}>Est. {school.establishmentYear}</p>}
        {(school.phone || school.email) && <p className="text-[11px] leading-tight text-slate-600 sm:text-[12px]">{[school.phone, school.email].filter(Boolean).join(" · ")}</p>}
      </div>
      <div className="rounded border px-1.5 py-2 text-center" style={{ backgroundColor: tint, borderColor: `${accent}35`, color: accent }}>
        <span className="block text-[10px] uppercase sm:text-[11px]">Academic Year</span><strong className="block text-[10px] sm:text-[12px]">{school.academicYear || "—"}</strong>
        <span className="mt-1 block border-t pt-1 text-[10px] uppercase sm:text-[11px]">Date of Issue</span><strong className="block text-[11px] sm:text-[11px]">{issueDate}</strong>
      </div>
    </header>

    <section className="my-3 rounded-md border px-2 py-2 text-center sm:my-4 sm:py-2.5" style={{ backgroundColor: tint, borderColor: `${accent}30` }}>
      <h2 className="break-words text-xs font-black uppercase tracking-wide sm:text-base" style={{ color: accent }}>{title}</h2>
      <p className="text-[11px] font-bold uppercase tracking-[0.32em] sm:text-[11px]" style={{ color: accent }}>Marks Statement</p>
    </section>

    <section className="relative z-10 grid grid-cols-[54px_minmax(0,1fr)_62px] items-center gap-2 rounded-md border border-slate-200 p-2 sm:grid-cols-[82px_minmax(0,1fr)_84px] sm:gap-3 sm:p-3">
      <div className="flex h-16 w-[52px] items-center justify-center overflow-hidden rounded bg-blue-50 sm:h-[82px] sm:w-[68px]">{photo ? <img src={photo} alt={studentName} className="h-full w-full object-cover" /> : <UserRound className="h-9 w-9 text-blue-300" strokeWidth={1.5} />}</div>
      <div className="grid min-w-0 grid-cols-2 gap-x-2 gap-y-1 sm:gap-x-4 sm:gap-y-1.5">
        {[["Student Name", studentName], ["Father's Name", student.fatherName || "—"], ["Mother's Name", student.motherName || "—"], ["Class", student.className || "—"], ["Roll No.", student.rollNumber || "—"], ["Admission No.", student.admissionNumber || "—"], ...(student.section ? [["Section", student.section]] : []), ...(student.dateOfBirth ? [["Date of Birth", student.dateOfBirth]] : [])].map(([label, value]) => <div key={label} className="min-w-0 text-[11px] leading-tight sm:text-[11px]"><span className="text-slate-600">{label}: </span><strong className="break-words text-slate-900">{value}</strong></div>)}
      </div>
      <div className="flex min-w-0 flex-col items-center text-center"><StudentQr value={studentId} /><span className="text-[10px] text-slate-600 sm:text-[11px]">Scan to Verify</span></div>
    </section>

    <div className={`relative z-10 ${isCompact ? "my-2 sm:my-2" : "my-3 sm:my-4"} overflow-hidden rounded border border-slate-200`}>
      <table className="w-full border-collapse text-left"><thead><tr>{["Sr. No.", "Subject", "Maximum Marks", "Marks Obtained", "Grade", "Remarks"].map((label) => <th key={label} className="px-1 py-1.5 text-center text-[10px] font-bold text-white sm:px-2 sm:py-2 sm:text-[12px]" style={{ backgroundColor: accent }}>{label}</th>)}</tr></thead>
        <tbody>{subjects.map((subject, index) => <tr key={`${subject.subject}-${index}`} className="border-t border-slate-100"><td className="px-1 py-1.5 text-center text-[11px] sm:px-2 sm:text-[11px]">{index + 1}</td><td className="px-1 py-1.5 text-[11px] sm:px-2 sm:text-[11px]">{subject.subject}</td><td className="px-1 py-1.5 text-center text-[11px] sm:px-2 sm:text-[11px]">{subject.maximum}</td><td className="px-1 py-1.5 text-center text-[11px] font-bold sm:px-2 sm:text-[11px]">{subject.absent ? "Absent" : subject.obtained}</td><td className="px-1 py-1.5 text-center text-[11px] font-bold sm:px-2 sm:text-[11px]">{subject.grade || "—"}</td><td className="px-1 py-1.5 text-[11px] sm:px-2 sm:text-[11px]">{subject.remarks || "—"}</td></tr>)}
          <tr className="border-t font-bold" style={{ backgroundColor: tint, color: accent }}><td colSpan={2} className="px-2 py-1.5 text-center text-[11px] sm:text-[11px]">Total</td><td className="px-1 py-1.5 text-center text-[11px] sm:text-[11px]">{totals.maximum}</td><td className="px-1 py-1.5 text-center text-[11px] sm:text-[11px]">{totals.obtained}</td><td className="px-1 py-1.5 text-center text-[11px] sm:text-[11px]">—</td><td className="px-1 py-1.5 text-center text-[11px] sm:text-[11px]">—</td></tr>
        </tbody>
      </table>
    </div>

    <section className="relative z-10 grid grid-cols-2 gap-1.5 sm:grid-cols-4 sm:gap-2">
      <Metric icon={BarChart3} label="Total Marks" value={`${totals.obtained} / ${totals.maximum}`} color="purple" />
      <Metric icon={Percent} label="Percentage" value={`${totals.percentage}%`} color="blue" />
      <Metric icon={Award} label="Grade" value={totals.grade || "—"} color="green" />
      <Metric icon={Trophy} label="Result" value={percentage >= 35 ? "PASS" : "FAIL"} color="gold" />
    </section>

    {remarks && <section className="relative z-10 mt-3 rounded-md border border-blue-100 bg-blue-50/70 p-2.5 sm:mt-4 sm:p-3"><h3 className="flex items-center gap-1.5 text-[10px] font-bold text-blue-950 sm:text-[12px]"><FileText size={12} />Remarks / Teacher's Comment</h3><p className="mt-1 break-words text-[11px] text-slate-800 sm:text-[11px]">{remarks}</p></section>}

    <footer className="relative z-10 mt-auto grid grid-cols-3 items-end gap-2 px-2 pb-3 pt-7 text-center sm:px-5 sm:pb-4 sm:pt-10">
      <div className="min-w-0"><div className="flex h-8 items-end justify-center sm:h-10">{teacherSignature ? <img src={teacherSignature} alt="Class teacher signature" className="max-h-full max-w-full object-contain" /> : <span aria-label="Sample class teacher signature; replace in School Profile" className="font-serif text-sm italic text-blue-800 sm:text-lg">{school.teacherName || "Teacher"}</span>}</div><div className="border-t border-slate-500 pt-1 text-[11px] font-bold sm:text-[11px]">Class Teacher</div>{school.teacherName && <span className="text-[10px] text-slate-700 sm:text-[12px]">{school.teacherName}</span>}</div>
      <div className="flex justify-center">{stamp ? <img src={stamp} alt="Official school stamp" className="h-14 w-14 object-contain sm:h-[72px] sm:w-[72px]" /> : <div aria-label="Replaceable school stamp placeholder" className="flex h-14 w-14 flex-col items-center justify-center rounded-full border-2 border-dashed text-center sm:h-[72px] sm:w-[72px]" style={{ borderColor: `${accent}90`, color: accent }}><span className="px-1 text-[5px] font-bold uppercase sm:text-[10px]">{school.shortName || schoolName}</span><span className="my-0.5 border-y px-1 text-[5px] font-bold sm:text-[10px]">SCHOOL SEAL</span><span className="text-[4px] uppercase sm:text-[5px]">Replace in settings</span></div>}</div>
      <div className="min-w-0"><div className="flex h-8 items-end justify-center sm:h-10">{principalSignature ? <img src={principalSignature} alt="Principal signature" className="max-h-full max-w-full object-contain" /> : <span aria-label="Sample principal signature; replace in School Profile" className="font-serif text-sm italic text-blue-800 sm:text-lg">{school.principalName || "Principal"}</span>}</div><div className="border-t border-slate-500 pt-1 text-[11px] font-bold sm:text-[11px]">Principal</div>{school.principalName && <span className="text-[10px] text-slate-700 sm:text-[12px]">{school.principalName}</span>}</div>
    </footer>

    <section className="mb-4 rounded border border-slate-200 bg-slate-50 p-2 text-[10px] text-slate-600 sm:text-[11px]"><strong className="flex items-center gap-1 text-slate-800"><CheckCircle2 size={10} />Note</strong><ol className="mt-1 list-decimal pl-4"><li>This is a computer generated result and does not require a handwritten signature.</li><li>In case of any discrepancy, please contact the school office within 15 days.</li><li>Grading system: A+ (90–100), A (75–89), B (60–74), C (40–59), F (below 40).</li></ol></section>

    <svg aria-hidden="true" viewBox="0 0 740 38" preserveAspectRatio="none" className="absolute bottom-0 left-0 h-8 w-full sm:h-10"><path d="M0 27 C170 5 280 35 430 18 C560 4 640 20 740 0 L740 38 L0 38Z" fill={accent} /><path d="M0 33 C160 12 300 40 460 24 C580 12 650 23 740 8 L740 38 L0 38Z" fill="#3b82c4" /></svg>
  </article>;
}
