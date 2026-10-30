"use client";

import { useEffect, useState } from "react";
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
  school: { name?: string; logo?: string; address?: string; phone?: string; email?: string; academicYear?: string; principalName?: string; teacherName?: string; stamp?: string; principalSignature?: string; teacherSignature?: string };
  student: { id?: string | number; name?: string; rollNumber?: string | number; admissionNumber?: string | number; className?: string; dateOfBirth?: string; photo?: string };
  subjects: ResultCardSubject[];
  totals: { maximum: string | number; obtained: string | number; percentage: string | number; grade?: string | null };
  remarks?: string | null;
}

function mediaUrl(value?: string) {
  if (!value) return "";
  return value.startsWith("http") ? value : `${API_BASE_URL.replace(/\/api\/?$/, "")}${value.startsWith("/") ? value : `/${value}`}`;
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
  return source ? <img src={source} alt="Student ID QR code" className="h-16 w-16 shrink-0 object-contain sm:h-24 sm:w-24" /> : <div className="h-16 w-16 sm:h-24 sm:w-24 shrink-0" />;
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
  const issueDate = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  return <article id="report-card-print" data-result-template={template} className={`mx-auto w-full min-w-0 max-w-5xl overflow-hidden rounded-2xl border bg-white p-3 text-slate-900 shadow-sm sm:rounded-3xl ${template === "compact" ? "sm:p-4" : "sm:p-6"}`} style={{ fontFamily: "Arial, sans-serif", borderColor: `${accent}40`, backgroundImage: template === "watermark" && logo ? `linear-gradient(rgba(255,255,255,.94),rgba(255,255,255,.94)),url("${logo}")` : undefined, backgroundPosition: "center", backgroundRepeat: "no-repeat", backgroundSize: "auto, 52%" }}>
    <header className="flex min-w-0 items-center gap-3 sm:gap-5">
      {logo ? <img src={logo} alt={`${schoolName} logo`} className="h-12 w-12 shrink-0 object-contain sm:h-20 sm:w-20" /> : <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl font-black sm:h-20 sm:w-20" style={{ backgroundColor: tint, color: accent }}>{schoolName.charAt(0)}</div>}
      <div className="min-w-0 flex-1"><h1 className="break-words text-base font-black leading-tight sm:text-2xl" style={{ color: accent }}>{schoolName}</h1>{school.address && <p className="mt-1 break-words text-[10px] text-slate-500 sm:text-sm">{school.address}</p>}{school.phone && <p className="text-[10px] text-slate-500 sm:text-xs">Phone: {school.phone}</p>}{school.email && <p className="break-all text-[10px] text-slate-500 sm:text-xs">Email: {school.email}</p>}</div>
      {school.academicYear && <div className="shrink-0 rounded-xl px-2 py-2 text-center sm:px-4" style={{ backgroundColor: tint, color: accent }}><span className="block text-[8px] text-slate-600 sm:text-xs">Academic Year</span><strong className="mt-1 block text-[10px] sm:text-sm">{school.academicYear}</strong></div>}
    </header>
    <section className={`my-3 rounded-xl px-2 py-3 text-center sm:my-5 sm:px-4 ${template === "compact" ? "sm:py-2" : "sm:py-4"}`} style={{ backgroundColor: tint }}><h2 className="break-words text-sm font-black uppercase tracking-wide sm:text-2xl sm:tracking-widest" style={{ color: accent }}>{title}</h2><p className="mt-1 text-[8px] font-bold uppercase tracking-[0.2em] sm:text-xs sm:tracking-[0.35em]" style={{ color: accent }}>Result Report Card</p></section>

    <section className="grid min-w-0 grid-cols-[56px_minmax(0,1fr)_64px] items-center gap-2 rounded-xl border border-slate-200 p-2 sm:grid-cols-[150px_minmax(0,1fr)_110px] sm:gap-5 sm:rounded-2xl sm:p-4">
      <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl sm:h-32 sm:w-full" style={{ backgroundColor: tint }}>{photo ? <img src={photo} alt={studentName} className="h-full w-full object-cover" /> : <span className="text-xl font-black sm:text-4xl" style={{ color: accent }}>{studentName.charAt(0)}</span>}</div>
      <div className="grid min-w-0 grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
        {[
          ["Student Name", studentName],
          ["Roll Number", student.rollNumber || "—"],
          ["Admission No.", student.admissionNumber || "—"],
          ["Class", student.className || "—"],
          ...(student.dateOfBirth ? [["Date of Birth", student.dateOfBirth]] : []),
        ].map(([label, value]) => <div key={label} className="min-w-0"><span className="block text-[8px] text-slate-500 sm:text-sm">{label}</span><strong className="block break-words text-[9px] leading-tight text-slate-900 sm:text-base">{value}</strong></div>)}
      </div>
      <div className="flex min-w-0 flex-col items-center text-center"><StudentQr value={studentId} /><span className="mt-1 text-[7px] text-slate-500 sm:text-[10px]">Student ID</span><strong className="max-w-full break-all text-[7px] text-slate-700 sm:text-[10px]">{studentId || "—"}</strong></div>
    </section>

    <div className="my-3 space-y-2 sm:hidden">
      {subjects.map((subject, index) => <section key={`${subject.subject}-${index}`} className="rounded-xl border border-slate-200 p-3"><div className="flex items-start justify-between gap-2"><strong className="min-w-0 break-words text-xs text-slate-900">{index + 1}. {subject.subject}</strong><span className="shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">{subject.grade || "—"}</span></div><div className="mt-2 grid grid-cols-2 gap-2 text-[10px]"><div><span className="block text-slate-500">Max Marks</span><strong>{subject.maximum}</strong></div><div><span className="block text-slate-500">Obtained</span><strong>{subject.absent ? "Absent" : subject.obtained}</strong></div>{subject.remarks && <div className="col-span-2"><span className="block text-slate-500">Remarks</span><strong className="break-words">{subject.remarks}</strong></div>}</div></section>)}
    </div>
    <div className="my-5 hidden overflow-x-auto rounded-2xl border border-slate-200 sm:block">
      <table className="w-full border-collapse text-left"><thead><tr>{["Sr. No.", "Subject", "Max Marks", "Obtained Marks", "Grade", "Remarks"].map((label) => <th key={label} className="border-b px-3 py-3 text-center text-xs font-bold" style={{ backgroundColor: tint, color: accent, borderColor: `${accent}30` }}>{label}</th>)}</tr></thead><tbody>{subjects.map((subject, index) => <tr key={`${subject.subject}-${index}`} className="border-t border-slate-100"><td className="px-3 py-2.5 text-center text-sm">{index + 1}</td><td className="px-3 py-2.5 text-sm">{subject.subject}</td><td className="px-3 py-2.5 text-center text-sm">{subject.maximum}</td><td className="px-3 py-2.5 text-center text-sm font-bold">{subject.absent ? "Absent" : subject.obtained}</td><td className="px-3 py-2.5 text-center text-sm font-bold">{subject.grade || "—"}</td><td className="px-3 py-2.5 text-sm">{subject.remarks || "—"}</td></tr>)}</tbody></table>
    </div>

    <section className="grid grid-cols-2 gap-2 sm:my-5 sm:grid-cols-4 sm:gap-3">
      {[["Total Marks", totals.maximum, "bg-purple-50 text-purple-800"], ["Obtained Marks", totals.obtained, "bg-blue-50 text-blue-800"], ["Percentage", `${totals.percentage}%`, "bg-emerald-50 text-emerald-800"], ["Overall Grade", totals.grade || "—", "bg-amber-50 text-amber-800"]].map(([label, value, color]) => <div key={label} className={`min-w-0 rounded-xl p-2.5 sm:rounded-2xl sm:p-4 ${color}`}><span className="block text-[8px] font-bold uppercase sm:text-[10px]">{label}</span><strong className="mt-1 block break-words text-base sm:text-xl">{value}</strong></div>)}
    </section>
    {remarks && <section className="mt-3 rounded-xl border border-slate-200 p-3 sm:mt-5 sm:rounded-2xl sm:p-4"><h3 className="text-xs font-black sm:text-base">Teacher's Remarks</h3><p className="mt-1 break-words text-[10px] text-slate-600 sm:text-sm">{remarks}</p></section>}
    <footer className="mt-6 grid grid-cols-3 items-end gap-2 text-center sm:mt-10 sm:gap-6">
      <div className="min-w-0"><div className="flex h-8 items-end justify-center sm:h-12">{teacherSignature && <img src={teacherSignature} alt="Class teacher signature" className="max-h-full max-w-full object-contain" />}</div><div className="border-t border-slate-400 pt-1 text-[8px] font-bold sm:text-xs">Class Teacher</div>{school.teacherName && <span className="block break-words text-[8px] text-slate-500 sm:text-[10px]">{school.teacherName}</span>}</div>
      <div className="flex h-12 items-center justify-center sm:h-20">{stamp ? <img src={stamp} alt="School stamp" className="h-12 w-12 object-contain sm:h-20 sm:w-20" /> : logo && <img src={logo} alt="School logo seal" className="h-10 w-10 rounded-full object-contain sm:h-16 sm:w-16" />}</div>
      <div className="min-w-0"><div className="flex h-8 items-end justify-center sm:h-12">{principalSignature && <img src={principalSignature} alt="Principal signature" className="max-h-full max-w-full object-contain" />}</div><div className="border-t border-slate-400 pt-1 text-[8px] font-bold sm:text-xs">Principal</div>{school.principalName && <span className="block break-words text-[8px] text-slate-500 sm:text-[10px]">{school.principalName}</span>}</div>
    </footer>
    <div className="mt-4 flex flex-wrap justify-between gap-2 border-t border-slate-200 pt-3 text-[8px] text-slate-500 sm:mt-6 sm:text-xs"><span>Date of Issue: {issueDate}</span><span>{schoolName}</span></div>
  </article>;
}
