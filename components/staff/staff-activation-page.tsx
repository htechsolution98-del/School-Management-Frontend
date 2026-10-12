"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Power, RefreshCw, Users } from "lucide-react";
import { DataTable, dynamicOptions, type DataTableColumn } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/providers/confirm-provider";
import { getStaffStatusRecords, setStaffActive, type StaffStatusRecord } from "@/lib/staff-activation";

const columns: DataTableColumn<StaffStatusRecord>[] = [
  { key: "name", header: "Staff member", search: row => [row.name, row.id], render: row => <div><p className="font-semibold">{row.name || "Unnamed staff"}</p><p className="text-xs text-slate-500">ID #{row.id}</p></div> },
  { key: "category", header: "Role", search: row => row.category },
  { key: "department", header: "Department", search: row => row.department_name || "Unassigned" },
  { key: "contact", header: "Contact", camelCase: false, search: row => [row.email, row.mobile], render: row => <div><p>{row.email || "—"}</p><p className="text-xs text-slate-500">{row.mobile || "—"}</p></div> },
  { key: "status", header: "Status", search: row => row.is_active ? "Active" : "Inactive", render: row => <span className={`rounded-full px-3 py-1 text-xs font-semibold ${row.is_active ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{row.is_active ? "Active" : "Inactive"}</span> },
];

export default function StaffActivationPage() {
  const confirm = useConfirm();
  const [rows, setRows] = useState<StaffStatusRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try { setRows(await getStaffStatusRecords()); }
    catch (error) { setError(error instanceof Error ? error.message : "Unable to load staff."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function changeStatus(row: StaffStatusRecord) {
    const desired = !row.is_active;
    if (!(await confirm(`${desired ? "Activate" : "Deactivate"} ${row.name || "this staff member"}? ${desired ? "Their account will be enabled." : "They will lose access to their account."}`))) return;
    setBusy(row.id);
    setError("");
    setSuccess("");
    try {
      const updated = await setStaffActive(row.id, desired);
      setRows(current => current.map(item => item.id === updated.id ? updated : item));
      setSuccess(`${updated.name || "Staff member"} ${updated.is_active ? "activated" : "deactivated"} successfully.`);
      window.dispatchEvent(new Event("staff_status_changed"));
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to update staff status."); }
    finally { setBusy(null); }
  }

  const active = rows.filter(row => row.is_active).length;
  return <div className="mx-auto max-w-7xl space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 p-6 text-white">
      <div><p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-100"><Users className="h-4 w-4" />Staff access management</p><h1 className="text-2xl font-bold">Staff Active / Deactive</h1><p className="mt-2 text-sm text-teal-100">Manage staff account access for your school.</p></div>
      <Button variant="outline" onClick={load} disabled={loading || busy !== null} className="bg-white text-teal-900 hover:bg-teal-50"><RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh</Button>
    </div>
    <div className="grid grid-cols-3 gap-3">{[["Total staff", rows.length], ["Active", active], ["Inactive", rows.length - active]].map(([label, count]) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold">{loading ? "—" : count}</p></div>)}</div>
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {success && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{success}</p>}
    <DataTable data={rows} columns={columns} getRowId={row => row.id} createdDate createdDateRange search searchPlaceholder="Search staff, role, email or mobile" loading={loading} error={error} caption="School staff account status" emptyTitle="No staff found for your school." filters={[
      { key: "status", label: "Status", options: [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }], match: (row, value) => Boolean(row.is_active) === (value === "active") },
      { key: "role", label: "Role", optionsFrom: data => dynamicOptions(data, row => row.category), match: (row, value) => row.category === value },
      { key: "department", label: "Department", optionsFrom: data => dynamicOptions(data, row => row.department_name || "Unassigned"), match: (row, value) => (row.department_name || "Unassigned") === value },
    ]} renderActions={row => <Button size="sm" variant="outline" disabled={loading || busy !== null} onClick={() => changeStatus(row)} aria-label={`${row.is_active ? "Deactivate" : "Activate"} ${row.name || "staff member"}`} className={row.is_active ? "text-rose-700" : "text-emerald-700"}>{busy === row.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Power className="mr-2 h-4 w-4" />}{row.is_active ? "Deactivate" : "Activate"}</Button>} />
  </div>;
}
