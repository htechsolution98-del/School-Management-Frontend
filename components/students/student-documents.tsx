"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { camelCaseText } from "@/lib/table-utils";
import { Eye, ShieldCheck, ShieldX, FileText, Trash2, Upload, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useConfirm } from "@/components/providers/confirm-provider";
import { mutateStudentDocument, DocumentRequestError } from "@/lib/clerk/student-profiles";
import { fetchWithAuth } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";
import { backendMediaUrl } from "@/lib/media";
import { SchoolProfileFieldEditor } from "./school-profile-field-editor";
import { dateText, StatusPill } from "./student-profile-parts";
import type { StudentDocumentItem, StudentProfileData } from "@/types/student-profile";

const documentTypes = ["OTHER", "RESULT", "REPORT_CARD", "CERTIFICATE", "ACHIEVEMENT"];
const selectClass = "mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900";
type Editor = { profileField?: number; kind: "upload" | "replace" | "edit"; document: StudentDocumentItem | null };

export function StudentDocuments({ student, onUpdated, onRefresh }: { student: StudentProfileData; onUpdated: (student: StudentProfileData) => void; onRefresh: () => Promise<void> }) {
  const confirm = useConfirm();
  const [busy, setBusy] = useState(false); const busyRef = useRef(false);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [preview, setPreview] = useState<StudentDocumentItem | null>(null);
  const [error, setError] = useState("");
  async function run(action: () => Promise<StudentProfileData>, success: string, confirmation?: string) {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setError("");
    try {
      if (confirmation && !await confirm(confirmation)) return;
      const updated = await action(); onUpdated(updated); setEditor(null); toast.success(success);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Document action failed. Please retry.";
      setError(message); toast.error(message);
      if (err instanceof DocumentRequestError && err.status === 409) await onRefresh();
    } finally { busyRef.current = false; setBusy(false); }
  }
  const contentUrl = (document: StudentDocumentItem) => `${API_BASE_URL}/students/${student.id}/documents/${document.id}/content/`;
  const previewUrl = preview ? contentUrl(preview) : null;
  const [downloading, setDownloading] = useState<string | null>(null);
  const downloadRef = useRef(false);
  async function download(document: StudentDocumentItem) {
    const url = contentUrl(document);
    if (!url || downloadRef.current) return;
    downloadRef.current = true; setDownloading(document.id);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetchWithAuth(url, { signal: controller.signal });
      if (!response.ok) throw new Error("The document could not be downloaded. Please retry.");
      const blob = await response.blob(); const objectUrl = URL.createObjectURL(blob);
      const anchor = window.document.createElement("a"); anchor.href = objectUrl;
      const extension = blob.type === "application/pdf" ? "pdf" : blob.type === "image/jpeg" ? "jpg" : blob.type.startsWith("image/") ? blob.type.split("/")[1] : document.file_name.split(".").pop();
      anchor.download = `${document.title.replace(/[^\p{L}\p{N} _-]/gu, "").trim() || "student-document"}.${extension || "pdf"}`;
      window.document.body.appendChild(anchor); anchor.click(); anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (err) { toast.error(controller.signal.aborted ? "Download timed out. Please retry." : err instanceof Error ? err.message : "Download failed."); }
    finally { window.clearTimeout(timeout); downloadRef.current = false; setDownloading(null); }
  }
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Documents <span className="text-slate-400">({student.completion.document_count})</span></h2><p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">Admission, student records and RTE uploads in one place.</p></div><div className="flex flex-wrap gap-2"><SchoolProfileFieldEditor kind="DOCUMENT" onAdded={onRefresh} disabled={busy} /><Button onClick={() => { setError(""); setEditor({ kind: "upload", document: null }); }} disabled={busy}><Upload className="h-4 w-4" />Upload document</Button></div></div>
    {!!student.completion.missing_documents.length && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"><p className="font-medium">Required documents missing</p><p className="mt-1">{student.completion.missing_documents.map(document => document.label).join(", ")}</p></div>}
    {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-300">{error}</p>}
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
    {student.documents.length ? <div className="contents">{student.documents.map(document => {
      const url = backendMediaUrl(document.url);
      return <article key={document.id} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-start justify-between gap-2"><div className="min-w-0"><h3 className="break-words text-sm font-semibold">{camelCaseText(document.title)}</h3><p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">{document.source === "adm" ? "Admission" : document.source === "rte" ? "RTE" : "Student record"}</p></div><div className="max-w-[55%] shrink-0 space-y-1.5 text-right"><p className="text-xs text-slate-500 dark:text-zinc-400">{dateText(document.uploaded_at)}</p><div className="flex flex-wrap justify-end gap-1.5"><StatusPill verified={!!url} label={url ? "Uploaded" : "File missing"} /><StatusPill verified={document.is_verified} label={document.is_verified ? "Verified" : "Pending review"} /></div></div></div>
        <div className="group relative mt-3 flex h-40 min-h-0 flex-col overflow-hidden rounded-xl sm:h-44">{url ? <><DocumentPreview key={`${document.id}-${document.file_name}`} url={contentUrl(document)} name={document.title} fileName={document.file_name} thumbnail /><button type="button" onClick={() => setPreview(document)} aria-label={`Preview ${document.title}`} className="absolute inset-0 flex items-center justify-center bg-slate-950/10 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"><span className="inline-flex size-9 items-center justify-center rounded-full bg-white text-slate-900 shadow-lg"><Eye className="h-4 w-4" /></span></button></> : <div className="flex flex-1 items-center justify-center bg-slate-50 text-sm text-slate-500 dark:bg-zinc-950">No file uploaded</div>}</div>
        {document.verified_by_name && <p className="mt-3 text-xs text-slate-500 dark:text-zinc-400">Verified by {document.verified_by_name} ? {dateText(document.verified_at)}</p>}
        <div className="mt-3 flex flex-nowrap items-center gap-1 border-t border-slate-100 pt-3 dark:border-zinc-800">
          <Button variant="outline" size="xs" className="h-7 px-2 text-[11px]" aria-label={document.is_verified ? `Revoke verification for ${document.title}` : `Verify document ${document.title}`} title={document.is_verified ? "Revoke" : "Verify"} disabled={!url || busy} onClick={() => void run(() => mutateStudentDocument(student.id, "PATCH", document, { is_verified: !document.is_verified, expected_file: document.file_name }), document.is_verified ? "Document verification revoked." : "Document verified successfully.", document.is_verified ? "Revoke verification for this document?" : "Confirm that you have reviewed this document before verifying it.")}>{document.is_verified ? <ShieldX className="size-3" /> : <ShieldCheck className="size-3" />}{document.is_verified ? "Revoke" : "Verify"}</Button>

          <Button variant="outline" size="xs" className="h-7 px-2 text-[11px]" disabled={busy} onClick={() => { setError(""); setEditor({ kind: "replace", document }); }}><Upload className="size-3" />Replace</Button>

          <Button variant="outline" size="xs" disabled={busy} className="h-7 px-2 text-[11px] text-rose-600 dark:text-rose-300" onClick={() => void run(() => mutateStudentDocument(student.id, "DELETE", document), "Document deleted.", "Are you sure you want to delete this document? This action cannot be undone.")}><Trash2 className="size-3" />Delete</Button>
          {url && <Button variant="outline" size="icon-xs" aria-label={`Download ${document.title}`} title="Download document" className="ml-auto size-7" disabled={busy || downloading !== null} onClick={() => void download(document)}>{downloading === document.id ? <Loader2 className="size-3 animate-spin" /> : <Download className="size-3" />}</Button>}
        </div>
      </article>;
    })}</div> : (student.shared_document_fields || []).length ? null : <div className="col-span-full rounded-2xl border border-dashed border-slate-300 p-10 text-center dark:border-zinc-700"><FileText className="mx-auto mb-3 h-9 w-9 text-slate-400" /><h3 className="font-medium">No uploaded documents</h3><p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">Upload a document or fill a required admission slot.</p></div>}
    {(student.shared_document_fields || []).some(field => !student.documents.some(document => document.profile_field === field.id)) && <div className="contents">{(student.shared_document_fields || []).filter(field => !student.documents.some(document => document.profile_field === field.id)).map(field => <article key={field.id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"><div className="flex items-center justify-between gap-3"><h3 className="break-words font-semibold">{field.label}</h3><StatusPill verified={false} label="Not uploaded" /></div><div className="mt-3 flex h-40 flex-col sm:h-44 items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 text-slate-400 dark:border-zinc-700 dark:bg-zinc-950"><FileText className="h-9 w-9" /><p className="text-sm">Upload this student&apos;s document</p></div><Button className="mt-4" variant="outline" disabled={busy} onClick={() => { setError(""); setEditor({ kind: "upload", document: null, profileField: field.id }); }}><Upload className="h-4 w-4" />Upload document</Button></article>)}</div>}
    </div>
    <Dialog open={!!editor} onOpenChange={open => { if (!open && !busy) setEditor(null); }}><DialogContent className={`max-h-[90dvh] overflow-y-auto dark:bg-zinc-900 ${editor?.kind === "replace" ? "sm:max-w-4xl" : ""}`}><DialogHeader><DialogTitle>{editor?.kind === "edit" ? "Edit document details" : editor?.kind === "replace" ? "Replace document" : "Upload document"}</DialogTitle><DialogDescription>{editor?.document?.title || "Upload a student record or a missing admission document."}</DialogDescription></DialogHeader>{editor && <DocumentEditor key={`${editor.kind}-${editor.document?.id || editor.profileField || "new"}`} editor={editor} student={student} busy={busy} error={error} onCancel={() => setEditor(null)} onSubmit={data => run(() => mutateStudentDocument(student.id, editor.kind === "upload" ? "POST" : "PATCH", editor.document, data), editor.kind === "replace" ? "Document replaced successfully." : editor.kind === "edit" ? "Document details saved." : "Document uploaded successfully.", editor.kind === "replace" ? "Replace this document with the selected file? The existing file will be removed after the new file is saved." : undefined)} />}</DialogContent></Dialog>
    <Dialog open={!!preview} onOpenChange={open => { if (!open) setPreview(null); }}><DialogContent className="flex h-[88dvh] min-h-0 flex-col gap-4 overflow-hidden p-4 sm:max-w-5xl sm:p-6 dark:bg-zinc-900"><DialogHeader className="shrink-0 pr-10"><DialogTitle className="break-words text-lg font-semibold">{camelCaseText(preview?.title || "Document")}</DialogTitle><DialogDescription>View the uploaded document or download a copy.</DialogDescription></DialogHeader>{previewUrl && <><DocumentPreview key={`${preview?.id}-${preview?.file_name}`} url={previewUrl} name={preview?.title || "Document"} fileName={preview?.file_name || ""} /><div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-slate-200 pt-4 dark:border-zinc-800"><Button disabled={busy || downloading !== null} onClick={() => preview && void download(preview)}><Download className="h-4 w-4" />Download</Button></div></>}</DialogContent></Dialog>

  </div>;
}

function DocumentPreview({ url, name, fileName, file, thumbnail = false }: { url: string; name: string; fileName: string; file?: File; thumbnail?: boolean }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null); const [error, setError] = useState("");
  const [image, setImage] = useState(false); const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); let objectUrl: string | null = null;
    void (async () => {
      let blob: Blob;
      if (file) blob = file;
      else {
        const response = await fetchWithAuth(url, { signal: controller.signal });
        if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data.detail || "The document could not be loaded. Please retry."); }
        blob = await response.blob();
      }
      if (controller.signal.aborted) return;
      const header = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
      const pdf = blob.type === "application/pdf" || String.fromCharCode(...header.slice(0, 5)) === "%PDF-";
      const isImage = blob.type.startsWith("image/") || /\.(png|jpe?g|webp)$/i.test(fileName);
      if (!pdf && !isImage) throw new Error("Preview is unavailable for this file type. Download it to view the document.");
      if (controller.signal.aborted) return;
      setImage(!pdf);
      objectUrl = URL.createObjectURL(pdf ? new Blob([blob], { type: "application/pdf" }) : blob); setBlobUrl(objectUrl);
    })().catch(err => { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Preview unavailable."); });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [url, fileName, file, attempt]);
  if (error) return <div role="alert" className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-6 text-center dark:border-zinc-800 dark:bg-zinc-950"><FileText className="h-10 w-10 text-slate-400" /><p className="max-w-md text-sm text-slate-600 dark:text-zinc-300">{error}</p><Button type="button" variant="outline" onClick={() => { setBlobUrl(null); setError(""); setAttempt(value => value + 1); }}>Retry preview</Button></div>;
  if (!blobUrl) return <div className="flex flex-1 items-center justify-center gap-2 text-slate-500"><Loader2 className="h-5 w-5 animate-spin" />Loading preview…</div>;
  if (image) return <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-zinc-800 dark:bg-zinc-950"><Image src={blobUrl} alt={name} fill unoptimized className="object-contain p-3" onError={() => setError("This image could not be displayed. Try downloading the document.")} /></div>;
  return <iframe title={`${name} preview`} src={thumbnail ? `${blobUrl}#toolbar=0&navpanes=0&scrollbar=0` : blobUrl} tabIndex={thumbnail ? -1 : undefined} className={`min-h-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 dark:border-zinc-700 ${thumbnail ? "pointer-events-none" : ""}`} />;
}

function DocumentEditor({ editor, student, busy, error, onCancel, onSubmit }: { editor: Editor; student: StudentProfileData; busy: boolean; error: string; onCancel: () => void; onSubmit: (data: FormData | Record<string, unknown>) => Promise<void> }) {
  const document = editor.document;
  const [profileField, setProfileField] = useState(String(editor.profileField || ""));
  const [source, setSource] = useState(document?.source || "std");
  const [title, setTitle] = useState(document?.title || "");
  const [type, setType] = useState(document?.document_type || "OTHER");
  const [description, setDescription] = useState(document?.description || "");
  const [expiry, setExpiry] = useState(document?.expiry_date || "");
  const [slot, setSlot] = useState(String(student.completion.missing_documents[0]?.id || ""));
  const [file, setFile] = useState<File | null>(null); const [localError, setLocalError] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setLocalError("");
    if (busy) return;
    if (editor.kind !== "edit") {
      if (!file) { setLocalError("Select a file to upload."); return; }
      if (file.size > 10 * 1024 * 1024) { setLocalError("Maximum file size is 10 MB."); return; }
      if (!/\.(pdf|jpe?g|png|webp)$/i.test(file.name)) { setLocalError("Upload a PDF, JPG, PNG or WebP document."); return; }
    }
    if (editor.kind !== "replace" && source !== "adm" && !profileField && !title.trim()) { setLocalError("Document name is required."); return; }
    if (source === "adm" && editor.kind === "upload" && !slot) { setLocalError("Select a required document slot."); return; }
    const metadata: Record<string, unknown> = {};
    if (editor.kind !== "replace") {
      if (source !== "adm" && !profileField) metadata.title = title.trim();
      if (source === "std") { metadata.document_type = type; metadata.description = description.trim(); }
      if (source === "rte") metadata.expiry_date = expiry || null;
    }
    if (document) metadata.expected_file = document.file_name;
    if (editor.kind === "edit") { await onSubmit(metadata); return; }
    const data = new FormData();
    Object.entries(metadata).forEach(([key, value]) => data.append(key, value === null ? "" : String(value)));
    if (file) data.append("file", file);
    if (editor.kind === "upload") { data.append("source", source); if (source === "std" && profileField) data.append("profile_field", profileField); if (source === "adm") data.append("document_field", slot); }
    await onSubmit(data);
  }
  return <form onSubmit={submit} className="space-y-4">
    {editor.kind === "replace" && document && <div className={`grid gap-4 ${file ? "md:grid-cols-2" : ""}`}>
      <section className="min-w-0 space-y-2"><h3 className="text-sm font-medium">Current document</h3><div className="flex h-[280px] min-h-0 flex-col sm:h-[360px]">{document.url ? <DocumentPreview url={`${API_BASE_URL}/students/${student.id}/documents/${document.id}/content/`} name={document.title} fileName={document.file_name} /> : <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-slate-200 text-sm text-slate-500 dark:border-zinc-700">No current file uploaded</div>}</div></section>
      {file && <section className="min-w-0 space-y-2"><h3 className="text-sm font-medium">Replacement preview</h3><div className="flex h-[280px] min-h-0 flex-col sm:h-[360px]">{file.size <= 10 * 1024 * 1024 && /\.(pdf|jpe?g|png|webp)$/i.test(file.name) ? <DocumentPreview key={`${file.name}-${file.size}-${file.lastModified}`} url="" name={file.name} fileName={file.name} file={file} /> : <p role="alert" className="flex flex-1 items-center justify-center rounded-xl bg-amber-50 p-4 text-center text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">Choose a PDF, JPG, PNG or WebP file up to 10 MB to preview.</p>}</div><p className="break-all text-xs text-slate-500 dark:text-zinc-400">{file.name}</p></section>}
    </div>}

    {editor.kind === "upload" && <div><Label htmlFor="document-source">Document category</Label><select id="document-source" className={selectClass} value={source} disabled={busy} onChange={event => { setSource(event.target.value as "std" | "adm" | "rte"); setProfileField(""); }}><option value="std">Student record</option>{student.completion.missing_documents.length > 0 && <option value="adm">Missing admission document</option>}{student.is_rte && <option value="rte">RTE document</option>}</select></div>}
    {editor.kind === "upload" && source === "std" && (student.shared_document_fields || []).length > 0 && <div><Label htmlFor="shared-document-field">Document field</Label><select id="shared-document-field" className={selectClass} value={profileField} disabled={busy} onChange={event => setProfileField(event.target.value)}><option value="">Other document</option>{(student.shared_document_fields || []).filter(field => !student.documents.some(document => document.profile_field === field.id)).map(field => <option key={field.id} value={field.id}>{field.label}</option>)}</select></div>}
    {source === "adm" && editor.kind === "upload" && <div><Label htmlFor="document-slot">Admission document</Label><select id="document-slot" value={slot} onChange={event => setSlot(event.target.value)} disabled={busy} className={selectClass}><option value="">Select a document</option>{student.completion.missing_documents.map(item => <option key={item.id} value={item.id}>{camelCaseText(item.label)}</option>)}</select></div>}
    {source !== "adm" && !profileField && editor.kind !== "replace" && <><div><Label htmlFor="document-title">Document name</Label><Input id="document-title" value={title} maxLength={255} onChange={event => setTitle(event.target.value)} disabled={busy} className="mt-2" required /></div>{source === "std" ? <><div><Label htmlFor="document-type">Document type</Label><select id="document-type" value={type} onChange={event => setType(event.target.value)} disabled={busy} className={selectClass}>{documentTypes.map(value => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></div><div><Label htmlFor="document-description">Description</Label><textarea id="document-description" value={description} onChange={event => setDescription(event.target.value)} disabled={busy} className={`${selectClass} h-24 py-3`} /></div></> : <div><Label htmlFor="document-expiry">Expiry date (optional)</Label><Input type="date" id="document-expiry" value={expiry} onChange={event => setExpiry(event.target.value)} disabled={busy} className="mt-2" /></div>}</>}
    {editor.kind !== "edit" && <div><Label htmlFor="document-file">{editor.kind === "replace" ? "Replacement file" : "Document file"}</Label><Input id="document-file" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={event => setFile(event.target.files?.[0] || null)} disabled={busy} className="mt-2" required /><p className="mt-2 text-xs text-slate-500 dark:text-zinc-400">PDF, JPG, PNG or WebP. Maximum 10 MB.</p></div>}
    {(localError || error) && <p role="alert" className="text-sm text-rose-600 dark:text-rose-300">{localError || error}</p>}
    <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" disabled={busy} onClick={onCancel}>Cancel</Button><Button type="submit" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}{busy ? "Saving…" : editor.kind === "edit" ? "Save details" : editor.kind === "replace" ? "Replace document" : "Upload document"}</Button></div>
  </form>;
}
