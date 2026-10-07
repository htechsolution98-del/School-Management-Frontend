"use client";

import { Fragment } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, Eye, FileText } from "lucide-react";
import type { groupStudentDocuments } from "@/lib/clerk/pending-documents";

export function StudentDocumentRows({ students, expanded, onExpand, onPreview }: {
  students: ReturnType<typeof groupStudentDocuments>;
  expanded: number | null;
  onExpand: (id: number | null) => void;
  onPreview: (document: { name: string; url: string }) => void;
}) {
  return <table className="w-full text-left text-xs">
    <thead className="border-b border-slate-100 bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
      <tr><th className="px-5 py-3.5">Student</th><th className="px-4 py-3.5">Class / Div</th><th className="px-4 py-3.5">Documents</th><th className="px-5 py-3.5 text-right">Action</th></tr>
    </thead>
    <tbody className="divide-y divide-slate-100">
      {students.map(student => {
        const open = expanded === student.admissionId;
        const pending = student.documents.filter(document => !document.isVerified).length;
        const toggle = () => onExpand(open ? null : student.admissionId);
        return <Fragment key={student.admissionId}>
          <tr className={`cursor-pointer transition-colors hover:bg-teal-50/50 ${open ? "bg-teal-50/50" : ""}`} onClick={toggle}>
            <td className="px-5 py-4"><button type="button" onClick={event => { event.stopPropagation(); toggle(); }} aria-expanded={open} aria-controls={`student-documents-${student.admissionId}`} className="flex items-center gap-3 rounded text-left focus-visible:outline-2 focus-visible:outline-teal-600">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-sm font-bold text-teal-700">{student.studentName[0]?.toUpperCase()}</span>
              <span><span className="block text-sm font-bold text-slate-900">{student.studentName}</span><span className="mt-1 block text-[11px] text-slate-500">{student.admissionNumber || "Admission record"}</span></span>
            </button></td>
            <td className="px-4 py-4 font-medium text-slate-600">{student.className}{student.divisionName ? ` / ${student.divisionName}` : ""}</td>
            <td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 font-semibold ${pending ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>{student.documents.length} document{student.documents.length === 1 ? "" : "s"}{pending ? ` · ${pending} pending` : " · Verified"}</span></td>
            <td className="px-5 py-4 text-right"><button type="button" onClick={event => { event.stopPropagation(); toggle(); }} aria-expanded={open} aria-controls={`student-documents-${student.admissionId}`} aria-label={`${open ? "Hide" : "View"} documents for ${student.studentName}`} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 font-semibold text-teal-700">{open ? "Hide" : "View documents"}{open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</button></td>
          </tr>
          <tr id={`student-documents-${student.admissionId}`} hidden={!open}>
            <td colSpan={4} className="bg-slate-50/70 p-4">
              <div className="rounded-xl border border-slate-200 bg-white">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3"><span className="font-bold text-slate-700">Documents for {student.studentName}</span><Link href="/clerk/students" className="font-semibold text-teal-700 hover:underline">Verify in student records</Link></div>
                <ul className="divide-y divide-slate-100">{student.documents.map(document => <li key={document.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <FileText size={16} className="shrink-0 text-teal-600" /><span className="min-w-0 flex-1 font-medium text-slate-800">{document.documentName}</span>
                  <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${document.isVerified ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{document.isVerified ? "Verified" : "Pending verification"}</span>
                  <button type="button" onClick={() => onPreview({ name: `${student.studentName} - ${document.documentName}`, url: document.fileUrl })} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 font-semibold text-slate-700 hover:bg-slate-200"><Eye size={13} />View file</button>
                </li>)}</ul>
              </div>
            </td>
          </tr>
        </Fragment>;
      })}
    </tbody>
  </table>;
}
