"use client";

import { useEffect, useState } from "react";
import { Award, BarChart3, CheckCircle2, FileText, Percent, Trophy, UserRound } from "lucide-react";
import QRCode from "qrcode";
import { API_BASE_URL } from "@/lib/config";
import type { ResultTemplateId } from "@/lib/result-template";
import { capitalizeWords, capitalizeSentence, formatSubjectName, formatGrade } from "@/lib/utils";

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
    watermark?: string;
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
  className?: string;
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
  return source ? (
    <img src={source} alt="Student ID QR code" className="h-11 w-11 sm:h-20 sm:w-20 object-contain" />
  ) : (
    <div className="h-11 w-11 sm:h-20 sm:w-20" />
  );
}

function Metric({ icon: Icon, label, value, color }: { icon: typeof Award; label: string; value: string | number; color: "purple" | "blue" | "green" | "gold" }) {
  const styles = {
    purple: "border-violet-200 bg-violet-50 text-violet-800",
    blue: "border-sky-200 bg-sky-50 text-sky-800",
    green: "border-emerald-200 bg-emerald-50 text-emerald-800",
    gold: "border-amber-200 bg-amber-50 text-amber-800",
  }[color];
  const iconStyles = {
    purple: "bg-violet-600 text-white",
    blue: "bg-sky-600 text-white",
    green: "bg-emerald-600 text-white",
    gold: "bg-amber-600 text-white",
  }[color];
  return (
    <div className={`flex min-w-0 items-center gap-1.5 rounded-xl border p-1.5 sm:gap-3 sm:p-3 ${styles}`}>
      <span className={`flex h-7 w-7 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg sm:rounded-xl shadow-xs ${iconStyles}`}>
        <Icon className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-[8px] font-bold uppercase tracking-wider sm:text-[11px] text-slate-500">{label}</span>
        <strong className="block text-[10px] font-black sm:text-base leading-tight text-slate-900">{value}</strong>
      </span>
    </div>
  );
}

export function ResultCardPreview({
  title,
  template = "classic",
  school,
  student,
  subjects,
  totals,
  remarks,
  className,
}: ResultCardPreviewProps) {
  const schoolName = capitalizeWords(school.name) || "School";
  const studentName = capitalizeWords(student.name) || "Student";
  const fatherName = student.fatherName ? capitalizeWords(student.fatherName) : "—";
  const motherName = student.motherName ? capitalizeWords(student.motherName) : "—";
  const classNameFormatted = student.className ? capitalizeWords(student.className) : "—";
  const studentId = String(student.admissionNumber || student.id || "");
  const logo = mediaUrl(school.logo);
  const watermarkImg = mediaUrl(school.watermark) || logo;
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
  const remarksFormatted = remarks ? capitalizeSentence(remarks) : "";

  return (
    <article
      data-result-card-preview="true"
      data-result-template={template}
      className={`relative isolate mx-auto box-border flex w-full max-w-[740px] flex-col overflow-hidden border bg-white ${
        isModern ? "rounded-xl p-2.5 sm:p-5" : "p-2.5 sm:p-7"
      } text-slate-900 shadow-sm ${className || ""}`}
      style={{
        fontFamily: "Georgia, 'Times New Roman', serif",
        borderColor: `${accent}45`,
        borderWidth: isModern ? 2 : 1,
        backgroundImage:
          isWatermark && watermarkImg
            ? `linear-gradient(rgba(255,255,255,0.96),rgba(255,255,255,0.96)),url("${watermarkImg}")`
            : undefined,
        backgroundPosition: "center, center 48%",
        backgroundRepeat: "no-repeat",
        backgroundSize: "auto, 80% auto",
      }}
    >
      <header
        className={`relative z-10 grid grid-cols-[46px_minmax(0,1fr)_78px] sm:grid-cols-[96px_minmax(0,1fr)_124px] items-center gap-1.5 sm:gap-4 border-b-2 pb-2 sm:pb-4 ${
          isModern ? "rounded-lg px-2 pt-2" : ""
        }`}
        style={{ borderColor: accent, ...(isModern ? { backgroundColor: accent, color: "white" } : {}) }}
      >
        <div className="flex h-11 w-11 sm:h-22 sm:w-22 items-center justify-center">
          {logo ? (
            <img src={logo} alt={`${schoolName} logo`} className="max-h-full max-w-full object-contain" />
          ) : (
            <span
              className="flex h-10 w-10 sm:h-16 sm:w-16 items-center justify-center rounded-full border-2 text-xs sm:text-xl font-bold"
              style={{ color: accent, borderColor: accent }}
            >
              {schoolName.charAt(0)}
            </span>
          )}
        </div>
        <div className="min-w-0 text-center">
          <h1 className="break-normal whitespace-normal text-xs sm:text-2xl font-black uppercase tracking-tight leading-snug" style={{ color: headerText }}>
            {schoolName}
          </h1>
          {school.address && (
            <p className={`mt-0.5 text-[8px] sm:text-[11px] leading-tight ${isModern ? "text-white/90" : "text-slate-700"}`}>
              {capitalizeWords(school.address)}
            </p>
          )}
          {school.tagline && (
            <p className={`text-[8px] sm:text-[11px] leading-tight ${isModern ? "text-white/90" : "text-slate-700"}`}>
              {capitalizeSentence(school.tagline)}
            </p>
          )}
          {school.boardAffiliation && (
            <p className={`text-[8px] sm:text-[11px] leading-tight ${isModern ? "text-white/90" : "text-slate-700"}`}>
              {capitalizeWords(school.boardAffiliation)}
            </p>
          )}
          <p className="text-[8px] sm:text-[11px] leading-tight text-slate-600">
            School Code: {school.schoolCode || "—"} <span className="px-0.5 sm:px-1">|</span> UDISE: {school.udiseCode || "—"}
          </p>
          {school.establishmentYear && (
            <p className={`text-[8px] sm:text-[11px] leading-tight ${isModern ? "text-white/90" : "text-slate-600"}`}>
              Est. {school.establishmentYear}
            </p>
          )}
          {(school.phone || school.email) && (
            <p className="text-[8px] sm:text-[11px] leading-tight text-slate-600">
              {[school.phone, school.email].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
        <div
          className="rounded-lg border p-1 sm:px-2.5 sm:py-2 text-center"
          style={{ backgroundColor: tint, borderColor: `${accent}35`, color: accent }}
        >
          <span className="block text-[7px] sm:text-[10px] uppercase leading-tight font-medium text-slate-500">Academic Year</span>
          <strong className="block text-[8px] sm:text-[12px] leading-tight font-black">{school.academicYear || "—"}</strong>
          <span className="mt-0.5 sm:mt-1 block border-t pt-0.5 text-[7px] sm:text-[10px] uppercase leading-tight font-medium text-slate-500">Date of Issue</span>
          <strong className="block text-[8px] sm:text-[11px] leading-tight font-bold">{issueDate}</strong>
        </div>
      </header>

      <section
        className="my-2 sm:my-3.5 rounded-lg border px-2 py-1.5 sm:py-2.5 text-center"
        style={{ backgroundColor: tint, borderColor: `${accent}30` }}
      >
        <h2 className="break-normal whitespace-normal text-xs sm:text-lg font-black uppercase tracking-wider" style={{ color: accent }}>
          {title}
        </h2>
        <p className="text-[8.5px] sm:text-xs font-bold uppercase tracking-[0.2em] sm:tracking-[0.3em] mt-0.5" style={{ color: accent }}>
          Marks Statement
        </p>
      </section>

      <section className="relative z-10 grid grid-cols-[40px_minmax(0,1fr)_48px] sm:grid-cols-[82px_minmax(0,1fr)_88px] items-center gap-2 sm:gap-4 rounded-xl border border-slate-200 p-2 sm:p-3.5 bg-slate-50/40">
        <div className="flex h-13 w-10 sm:h-22 sm:w-18 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xs">
          {photo ? (
            <img src={photo} alt={studentName} className="h-full w-full object-cover" />
          ) : (
            <UserRound className="h-6 w-6 sm:h-10 sm:w-10 text-blue-300" strokeWidth={1.5} />
          )}
        </div>
        <div className="grid min-w-0 grid-cols-1 sm:grid-cols-2 gap-x-3 sm:gap-x-6 gap-y-0.5 sm:gap-y-1.5">
          {[
            ["Student", studentName],
            ["Father's Name", fatherName],
            ["Mother's Name", motherName],
            ["Class & Section", `${classNameFormatted}${student.section ? ` (${student.section.toUpperCase()})` : ""}`],
            ["Roll No.", student.rollNumber || "—"],
            ["Admission No.", student.admissionNumber || "—"],
            ...(student.dateOfBirth ? [["Date of Birth", student.dateOfBirth]] : []),
          ].map(([label, value]) => (
            <div key={label} className="min-w-0 text-[8.5px] sm:text-xs leading-snug">
              <span className="text-slate-500 font-medium">{label}: </span>
              <strong className="text-slate-900 font-bold">{value}</strong>
            </div>
          ))}
        </div>
        <div className="flex min-w-0 flex-col items-center text-center">
          <StudentQr value={studentId} />
          <span className="text-[7.5px] sm:text-[11px] font-semibold text-slate-500 leading-tight mt-0.5">Verify ID</span>
        </div>
      </section>

      <div className={`relative z-10 ${isCompact ? "my-1.5 sm:my-2" : "my-2 sm:my-3.5"} overflow-hidden rounded-xl border border-slate-200`}>
        <table className="w-full border-collapse text-left table-auto">
          <thead>
            <tr>
              <th className="px-1.5 py-1.5 text-center text-[8.5px] sm:text-xs font-bold text-white w-7 sm:w-12" style={{ backgroundColor: accent }}>
                Sr.
              </th>
              <th className="px-1.5 py-1.5 text-left text-[8.5px] sm:text-xs font-bold text-white" style={{ backgroundColor: accent }}>
                Subject
              </th>
              <th className="px-1.5 py-1.5 text-center text-[8.5px] sm:text-xs font-bold text-white w-10 sm:w-16" style={{ backgroundColor: accent }}>
                Max
              </th>
              <th className="px-1.5 py-1.5 text-center text-[8.5px] sm:text-xs font-bold text-white w-12 sm:w-20" style={{ backgroundColor: accent }}>
                Obtained
              </th>
              <th className="px-1.5 py-1.5 text-center text-[8.5px] sm:text-xs font-bold text-white w-10 sm:w-16" style={{ backgroundColor: accent }}>
                Grade
              </th>
              <th className="hidden sm:table-cell px-2 py-1.5 text-left text-xs font-bold text-white" style={{ backgroundColor: accent }}>
                Remarks
              </th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((subject, index) => (
              <tr key={`${subject.subject}-${index}`} className="border-t border-slate-100 hover:bg-slate-50/60">
                <td className="px-1.5 py-1.5 sm:py-2 text-center text-[8.5px] sm:text-xs font-medium text-slate-500">{index + 1}</td>
                <td className="px-1.5 py-1.5 sm:py-2 text-[8.5px] sm:text-xs font-bold text-slate-800">
                  {formatSubjectName(subject.subject)}
                </td>
                <td className="px-1.5 py-1.5 sm:py-2 text-center text-[8.5px] sm:text-xs font-semibold text-slate-600">{subject.maximum}</td>
                <td className="px-1.5 py-1.5 sm:py-2 text-center text-[8.5px] sm:text-xs font-black text-slate-900">
                  {subject.absent ? "Absent" : subject.obtained}
                </td>
                <td className="px-1.5 py-1.5 sm:py-2 text-center text-[8.5px] sm:text-xs font-bold text-blue-700">
                  {formatGrade(subject.grade) || "—"}
                </td>
                <td className="hidden sm:table-cell px-2 py-1.5 sm:py-2 text-xs text-slate-600">
                  {subject.remarks ? capitalizeSentence(subject.remarks) : "—"}
                </td>
              </tr>
            ))}
            <tr className="border-t-2 font-bold" style={{ backgroundColor: tint, color: accent }}>
              <td colSpan={2} className="px-2 py-1.5 sm:py-2 text-left font-black text-[9px] sm:text-xs uppercase tracking-wide">
                Total Marks
              </td>
              <td className="px-1.5 py-1.5 sm:py-2 text-center text-[9px] sm:text-xs font-extrabold">{totals.maximum}</td>
              <td className="px-1.5 py-1.5 sm:py-2 text-center text-[9px] sm:text-xs font-black">{totals.obtained}</td>
              <td className="px-1.5 py-1.5 sm:py-2 text-center text-[9px] sm:text-xs font-extrabold">{totals.grade || "—"}</td>
              <td className="hidden sm:table-cell px-2 py-1.5 sm:py-2 text-center text-xs font-bold">{percentage.toFixed(1)}%</td>
            </tr>
          </tbody>
        </table>
      </div>

      <section className="relative z-10 grid grid-cols-2 gap-1.5 sm:grid-cols-4 sm:gap-2.5">
        <Metric icon={BarChart3} label="Total Marks" value={`${totals.obtained} / ${totals.maximum}`} color="purple" />
        <Metric icon={Percent} label="Percentage" value={`${totals.percentage}%`} color="blue" />
        <Metric icon={Award} label="Grade" value={formatGrade(totals.grade) || "—"} color="green" />
        <Metric icon={Trophy} label="Result" value={percentage >= 35 ? "PASS" : "FAIL"} color="gold" />
      </section>

      {remarksFormatted && (
        <section className="relative z-10 mt-2 sm:mt-3.5 rounded-lg border border-blue-100 bg-blue-50/70 p-2 sm:p-3">
          <h3 className="flex items-center gap-1.5 text-[8.5px] sm:text-xs font-bold text-blue-950">
            <FileText size={12} className="text-blue-600" /> Remarks / Teacher's Comment
          </h3>
          <p className="mt-0.5 break-words text-[8.5px] sm:text-xs text-slate-800 leading-relaxed">{remarksFormatted}</p>
        </section>
      )}

      <footer className="relative z-10 mt-auto grid grid-cols-3 items-end gap-1 px-1 pb-2 pt-3 sm:px-6 sm:pb-4 sm:pt-8 text-center">
        <div className="min-w-0">
          <div className="flex h-7 sm:h-12 items-end justify-center pb-1">
            {teacherSignature ? (
              <img src={teacherSignature} alt="Class teacher signature" className="max-h-full max-w-full object-contain" />
            ) : (
              <span aria-label="Sample class teacher signature; replace in School Profile" className="font-serif text-[11px] sm:text-lg italic text-blue-800">
                {capitalizeWords(school.teacherName) || "Teacher"}
              </span>
            )}
          </div>
          <div className="border-t border-slate-400 pt-1 text-[8.5px] sm:text-xs font-bold text-slate-800">Class Teacher</div>
          {school.teacherName && (
            <span className="text-[7.5px] sm:text-[11px] text-slate-600 block truncate mt-0.5">{capitalizeWords(school.teacherName)}</span>
          )}
        </div>
        <div className="flex justify-center">
          {stamp ? (
            <img src={stamp} alt="Official school stamp" className="h-10 w-10 sm:h-[70px] sm:w-[70px] object-contain" />
          ) : (
            <div
              aria-label="Replaceable school stamp placeholder"
              className="flex h-10 w-10 sm:h-[70px] sm:w-[70px] flex-col items-center justify-center rounded-full border-2 border-dashed text-center"
              style={{ borderColor: `${accent}90`, color: accent }}
            >
              <span className="px-0.5 text-[4.5px] sm:text-[10px] font-bold uppercase truncate">{school.shortName || schoolName}</span>
              <span className="my-0.5 border-y px-0.5 text-[4.5px] sm:text-[10px] font-bold">SEAL</span>
              <span className="text-[3.5px] sm:text-[6px] uppercase tracking-wider">Official</span>
            </div>
          )}
        </div>
        <div className="min-w-0">
          <div className="flex h-7 sm:h-12 items-end justify-center pb-1">
            {principalSignature ? (
              <img src={principalSignature} alt="Principal signature" className="max-h-full max-w-full object-contain" />
            ) : (
              <span aria-label="Sample principal signature; replace in School Profile" className="font-serif text-[11px] sm:text-lg italic text-blue-800">
                {capitalizeWords(school.principalName) || "Principal"}
              </span>
            )}
          </div>
          <div className="border-t border-slate-400 pt-1 text-[8.5px] sm:text-xs font-bold text-slate-800">Principal</div>
          {school.principalName && (
            <span className="text-[7.5px] sm:text-[11px] text-slate-600 block truncate mt-0.5">{capitalizeWords(school.principalName)}</span>
          )}
        </div>
      </footer>

      <section className="mb-2 sm:mb-4 rounded border border-slate-200 bg-slate-50 p-1.5 sm:p-2 text-[7px] sm:text-[11px] text-slate-600">
        <strong className="flex items-center gap-1 text-slate-800">
          <CheckCircle2 size={9} /> Note
        </strong>
        <ol className="mt-0.5 list-decimal pl-3 leading-tight">
          <li>Computer generated result. Does not require physical signature.</li>
          <li>Report discrepancies within 15 days.</li>
        </ol>
      </section>

      <svg aria-hidden="true" viewBox="0 0 740 38" preserveAspectRatio="none" className="absolute bottom-0 left-0 h-6 w-full sm:h-10">
        <path d="M0 27 C170 5 280 35 430 18 C560 4 640 20 740 0 L740 38 L0 38Z" fill={accent} />
        <path d="M0 33 C160 12 300 40 460 24 C580 12 650 23 740 8 L740 38 L0 38Z" fill="#3b82c4" />
      </svg>
    </article>
  );
}
