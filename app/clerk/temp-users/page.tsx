"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Users, UserCheck, UserX, RefreshCw, ShieldOff, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getTempUsersForPrincipal, activateTempUser, deactivateTempUser, deactivateAllTempUsers } from "@/lib/principal";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { TempUser } from "@/types/principal";
import "../clerk-workspace.css";

export default function TempUsersPage() {
  const [users, setUsers] = useState<TempUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<number | "all" | null>(null);
  const [confirmation, setConfirmation] = useState<TempUser | "all" | null>(null);
  const mutationLock = useRef(false);
  const active = users.filter(user => user.is_active).length;
  const loadUsers = useCallback(async () => {
    setLoading(true); setError("");
    try { setUsers((await getTempUsersForPrincipal()).map(user => ({ ...user, is_active: user.is_active ?? user.status === "active" }))); }
    catch (error) { setError(error instanceof Error ? error.message : "Could not load temporary users"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void loadUsers(); }, [loadUsers]);
  async function changeAccess(target: TempUser | "all") {
    if (mutationLock.current) return;
    mutationLock.current = true; setBusy(target === "all" ? "all" : target.id);
    try {
      if (target === "all") { await deactivateAllTempUsers(); setUsers(current => current.map(user => ({ ...user, is_active: false }))); }
      else { await (target.is_active ? deactivateTempUser(target.id) : activateTempUser(target.id)); setUsers(current => current.map(user => user.id === target.id ? { ...user, is_active: !target.is_active } : user)); }
      toast.success(target === "all" ? "All temporary accounts deactivated" : target.is_active ? "Account deactivated" : "Account activated"); setConfirmation(null);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not update access"); }
    finally { mutationLock.current = false; setBusy(null); }
  }
  const columns: DataTableColumn<TempUser>[] = [
    { key: "username", header: "Account", search: user => user.username, camelCase: false, render: user => <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-sm font-bold text-[#5826df]">{user.username?.slice(0, 2).toUpperCase()}</span><span className="font-semibold text-slate-800">{user.username}</span></div> },
    { key: "email", header: "Email", camelCase: false, search: user => user.email || "", render: user => user.email || <span className="text-slate-400">Not provided</span> },
    { key: "mobile", header: "Mobile", camelCase: false, search: user => user.mobile || "", render: user => user.mobile || <span className="text-slate-400">Not provided</span> },
    { key: "status", header: "Access", search: user => user.is_active ? "Active" : "Deactivated", render: user => <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${user.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{user.is_active ? <ShieldCheck size={12} /> : <ShieldOff size={12} />}{user.is_active ? "Active" : "Deactivated"}</span> },
  ];
  return <div className="clerk-page space-y-6">
    <div className="grid gap-4 sm:grid-cols-3">{[{ label: "Total accounts", value: users.length, icon: Users, color: "bg-slate-100 text-slate-600" }, { label: "Active access", value: active, icon: UserCheck, color: "bg-indigo-50 text-[#5826df]" }, { label: "Deactivated", value: users.length - active, icon: UserX, color: "bg-amber-50 text-amber-700" }].map(stat => <div key={stat.label} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5"><div><p className="text-xs font-medium text-slate-500">{stat.label}</p><p className="mt-2 text-3xl font-bold text-slate-900">{loading ? "..." : stat.value}</p></div><span className={`rounded-xl p-3 ${stat.color}`}><stat.icon size={22} /></span></div>)}</div>
    <section className="office-section overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-5"><div><h2 className="text-base font-bold text-slate-900">Temporary accounts</h2><p className="mt-1 text-xs text-slate-500">Review applicant accounts and manage their access.</p></div><div className="flex flex-wrap gap-2"><button type="button" disabled={loading || busy !== null} onClick={loadUsers} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold disabled:opacity-50 hover:bg-slate-50"><RefreshCw size={14} className={loading ? "animate-spin" : ""} />Refresh</button><button type="button" disabled={!active || loading || busy !== null} onClick={() => setConfirmation("all")} className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 disabled:opacity-40"><ShieldOff size={14} />Deactivate all</button></div></div>
      {error && <div role="alert" className="m-4 flex items-center justify-between rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}<button type="button" onClick={loadUsers} className="font-semibold underline">Retry</button></div>}
      <DataTable data={users} columns={columns} getRowId={user => user.id} loading={loading} createdDate={false} searchPlaceholder="Search username, email or mobile..." filters={[{ key: "access", label: "Access", options: [{ value: "active", label: "Active" }, { value: "inactive", label: "Deactivated" }], match: (user, value) => value === "active" ? Boolean(user.is_active) : !user.is_active }]} emptyTitle="No temporary accounts yet" emptyDescription="Applicant accounts will appear here when they register." renderActions={user => <button type="button" disabled={busy !== null || loading} onClick={() => user.is_active ? setConfirmation(user) : changeAccess(user)} className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-50 ${user.is_active ? "border-slate-200 text-slate-600 hover:bg-slate-50" : "border-indigo-200 bg-indigo-50 text-[#5826df]"}`}>{busy === user.id ? <Loader2 size={13} className="animate-spin" /> : user.is_active ? <ShieldOff size={13} /> : <ShieldCheck size={13} />}{user.is_active ? "Deactivate" : "Activate"}</button>} />
    </section>
    <Dialog open={confirmation !== null} onOpenChange={open => { if (!open && busy === null) setConfirmation(null); }}><DialogContent showCloseButton={busy === null}><DialogHeader><DialogTitle className="font-bold">{confirmation === "all" ? "Deactivate all temporary accounts?" : "Deactivate this account?"}</DialogTitle><DialogDescription>{confirmation === "all" ? `${active} active accounts will lose access. You can reactivate accounts individually.` : `Access for ${confirmation?.username || "this user"} will be disabled. You can reactivate it later.`}</DialogDescription></DialogHeader><DialogFooter><button type="button" disabled={busy !== null} onClick={() => setConfirmation(null)} className="rounded-lg border px-4 py-2">Cancel</button><button type="button" disabled={busy !== null} onClick={() => confirmation && changeAccess(confirmation)} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 font-semibold text-white">{busy !== null && <Loader2 size={14} className="animate-spin" />}Deactivate</button></DialogFooter></DialogContent></Dialog>
  </div>;
}
