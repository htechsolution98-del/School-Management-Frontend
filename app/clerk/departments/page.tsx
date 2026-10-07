"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Building2, Loader2, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getDepartments, createDepartment } from "@/lib/staff";
import { parseDepartments } from "@/lib/clerk/hr-validation";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import type { Department } from "@/types";
import "../clerk-workspace.css";

const columns: DataTableColumn<Department>[] = [
  { key: "id", header: "ID", search: row => String(row.id), render: row => <span className="font-mono text-slate-400">#{row.id}</span> },
  { key: "name", header: "Department", sticky: true, search: row => row.name, camelCase: false, render: row => <span className="flex items-center gap-3 font-medium"><span className="hr-avatar"><Building2 size={16} /></span>{row.name}</span> },
];

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [progress, setProgress] = useState("");
  const busy = useRef(false);
  const load = useCallback(async () => {
    setLoading(true);
    try { setDepartments(await getDepartments()); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not load departments."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy.current || loading) return;
    setError(""); setSuccess("");
    const parsed = parseDepartments(input, departments);
    if (parsed.error) { setError(parsed.error); return; }
    busy.current = true; setSubmitting(true);
    const created: Department[] = [];
    const failed: string[] = [];
    const messages: string[] = [];
    try {
      for (const [index, name] of parsed.names.entries()) {
        setProgress(`Creating ${index + 1} of ${parsed.names.length} departments`);
        try { created.push(await createDepartment(name)); }
        catch (err) { failed.push(name); messages.push(`${name}: ${err instanceof Error ? err.message : "Creation failed"}`); }
      }
      setDepartments(previous => [...previous, ...created]);
      setInput(failed.join(", "));
      if (created.length) setSuccess(`${created.length} department${created.length === 1 ? "" : "s"} created successfully.`);
      if (failed.length) setError(`${messages.join("; ")}. Only unsuccessful names remain in the form for retry.`);
    } finally { busy.current = false; setSubmitting(false); setProgress(""); }
  };

  const preview = input.split(",").map(name => name.trim()).filter(Boolean);
  return <div className="clerk-page hr-page space-y-6">
    <div className="hr-department-layout">
      <section className="hr-panel hr-create-panel">
        <div className="hr-panel-heading"><span className="hr-avatar"><Plus size={18} /></span><div><h2>Create departments</h2><p>Add one or several in a single step.</p></div></div>
        <form onSubmit={create} className="space-y-4">
          <label htmlFor="department-names" className="hr-field-label">Department names</label>
          <textarea id="department-names" rows={4} value={input} disabled={submitting} aria-invalid={!!error} aria-describedby="department-help department-error" onChange={event => { setInput(event.target.value); setError(""); setSuccess(""); }} placeholder="Science, Mathematics, Administration" className="hr-textarea" />
          <p id="department-help" className="text-xs leading-5 text-slate-500">Separate each name with a comma. Maximum 100 characters per name.</p>
          {!!preview.length && <div className="flex flex-wrap gap-2">{preview.map((name, index) => <span key={index} className="hr-chip">{name}</span>)}</div>}
          <p id="department-error" role="alert" className="text-xs leading-5 text-rose-600">{error}</p>
          {success && <p role="status" className="hr-success">{success}</p>}
          <Button type="submit" disabled={loading || submitting || !input.trim()} className="office-primary w-full">{submitting ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}{submitting ? progress : `Create ${preview.length > 1 ? `${preview.length} departments` : "department"}`}</Button>
        </form>
      </section>
      <section className="hr-directory min-w-0"><div className="hr-directory-heading"><div><h2>Department directory</h2><p>{departments.length} departments in your school</p></div><Button variant="outline" disabled={loading || submitting} onClick={() => { setError(""); void load(); }}><RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh</Button></div><DataTable data={departments} columns={columns} getRowId={row => row.id} loading={loading} search searchPlaceholder="Search department names" createdDate createdDateRange minWidth={540} emptyTitle="No departments yet" emptyDescription="Add your first department using the form." caption="School departments" /></section>
    </div>
  </div>;
}
