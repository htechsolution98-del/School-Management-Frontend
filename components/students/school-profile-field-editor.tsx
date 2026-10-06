"use client";
import { useRef, useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { createSchoolProfileField } from "@/lib/clerk/student-profiles";
export function SchoolProfileFieldEditor({ kind, onAdded, disabled = false }: { kind: "ID" | "DOCUMENT"; onAdded: () => Promise<void>; disabled?: boolean }) {
  const [open, setOpen] = useState(false); const [label, setLabel] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const lock = useRef(false);
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (lock.current) return; lock.current = true; setBusy(true); setError("");
    try { await createSchoolProfileField(kind, label.trim()); await onAdded(); setOpen(false); setLabel(""); toast.success("Field added for all students in this school."); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to add field."); }
    finally { lock.current = false; setBusy(false); }
  }
  return <><Button type="button" variant="outline" disabled={disabled} onClick={() => { setError(""); setOpen(true); }}><Plus className="h-4 w-4" />{kind === "ID" ? "Add ID field" : "Add document field"}</Button><Dialog open={open} onOpenChange={value => { if (!busy) setOpen(value); }}><DialogContent><DialogHeader><DialogTitle>{kind === "ID" ? "Add Government ID field" : "Add document field"}</DialogTitle><DialogDescription>This field will appear for every student in your school. Each student keeps their own value or uploaded file.</DialogDescription></DialogHeader><form className="space-y-4" onSubmit={save}><div><Label htmlFor={`school-field-${kind}`}>Field name</Label><Input id={`school-field-${kind}`} className="mt-2" value={label} onChange={event => setLabel(event.target.value)} maxLength={100} disabled={busy} required /></div>{error && <p role="alert" className="text-sm text-rose-600">{error}</p>}<div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={busy || !label.trim()}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Add field</Button></div></form></DialogContent></Dialog></>;
}
