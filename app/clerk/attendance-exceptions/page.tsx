"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Search, ShieldCheck, Clock3 } from "lucide-react";
import { getAttendanceRegularizations } from "@/lib/hr-config";
import type { AttendanceRegularization } from "@/types/hr-config";

type StatusFilter = "All" | "Pending" | "Approved" | "Rejected";

function displayDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

function displayTime(value?: string | null) {
  if (!value) return "—";
  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return value;
  return `${String(hours % 12 || 12).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${hours >= 12 ? "PM" : "AM"}`;
}

export default function ClerkAttendanceExceptionsPage() {
  const [requests, setRequests] = useState<AttendanceRegularization[]>([]);
  const [status, setStatus] = useState<StatusFilter>("All");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRequests(await getAttendanceRegularizations());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load attendance requests.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadRequests(); }, [loadRequests]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return requests.filter((request) => {
      const matchesStatus = status === "All" || request.status.toLowerCase() === status.toLowerCase();
      const matchesSearch = !query ||
        (request.staff_name || `staff #${request.staff}`).toLowerCase().includes(query) ||
        request.attendance_date.includes(query) || request.reason.toLowerCase().includes(query);
      return matchesStatus && matchesSearch;
    });
  }, [requests, search, status]);

  return (
    <main className="mx-auto max-w-7xl space-y-5 px-4 py-6">
      <section className="flex flex-col justify-between gap-4 rounded-3xl bg-gradient-to-r from-indigo-950 to-indigo-700 p-6 text-white sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wide">
            <ShieldCheck className="h-4 w-4" /> Read-only attendance oversight
          </div>
          <h1 className="text-2xl font-extrabold">Staff Attendance Exceptions</h1>
          <p className="mt-1 text-sm text-indigo-100">Review school-wide regularization requests and their decision history.</p>
        </div>
        <button onClick={() => void loadRequests()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-semibold hover:bg-white/20 disabled:opacity-60">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/70 p-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input aria-label="Search requests" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search staff, date, or reason" className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-400" />
          </div>
          <div className="flex flex-wrap gap-2">
            {(["All", "Pending", "Approved", "Rejected"] as const).map((item) => (
              <button key={item} onClick={() => setStatus(item)} className={`rounded-xl px-3 py-2 text-xs font-bold ${status === item ? "bg-indigo-600 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"}`}>
                {item} {item === "All" ? `(${requests.length})` : `(${requests.filter((request) => request.status.toLowerCase() === item.toLowerCase()).length})`}
              </button>
            ))}
          </div>
        </div>

        {loading ? <div className="p-12 text-center text-sm text-slate-500">Loading requests…</div> : error ? (
          <div role="alert" className="p-8 text-center text-sm text-rose-700">{error}<button onClick={() => void loadRequests()} className="ml-2 font-bold underline">Retry</button></div>
        ) : filtered.length === 0 ? <div className="p-12 text-center text-sm text-slate-500">No attendance requests match these filters.</div> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-white text-xs uppercase tracking-wide text-slate-500">
                <tr><th className="px-4 py-3">Staff</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Requested punches</th><th className="px-4 py-3">Reason</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Decision history</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((request) => (
                  <tr key={request.id} className="align-top hover:bg-slate-50/60">
                    <td className="px-4 py-4"><div className="font-semibold text-slate-900">{request.staff_name || `Staff #${request.staff}`}</div><div className="text-xs text-slate-500">ID #{request.staff}</div></td>
                    <td className="whitespace-nowrap px-4 py-4">{displayDate(request.attendance_date)}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-600">In {displayTime(request.requested_check_in)}<br />Out {displayTime(request.requested_check_out)}</td>
                    <td className="max-w-xs px-4 py-4 text-slate-600">{request.reason}</td>
                    <td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${request.status === "Approved" ? "bg-emerald-50 text-emerald-700" : request.status === "Rejected" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}>{request.status}</span>{request.approved_by_username && <div className="mt-1 text-xs text-slate-500">by {request.approved_by_username}</div>}</td>
                    <td className="px-4 py-4">
                      <button onClick={() => setExpandedId(expandedId === request.id ? null : request.id)} className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:underline"><Clock3 className="h-3.5 w-3.5" /> {expandedId === request.id ? "Hide" : "View"} ({request.audit_log?.length || 0})</button>
                      {expandedId === request.id && <ol className="mt-2 space-y-2 text-xs text-slate-600">{(request.audit_log || []).map((entry, index) => <li key={`${request.id}-${index}`} className="border-l-2 border-indigo-200 pl-2"><span className="font-semibold">{entry.action}</span>{entry.by_username ? ` by ${entry.by_username}` : ""}{entry.timestamp ? ` · ${new Date(entry.timestamp).toLocaleString("en-IN")}` : ""}{entry.note ? <div>{entry.note}</div> : null}</li>)}</ol>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <p className="text-xs text-slate-500">This page is for viewing only. Approval and rejection remain restricted to authorized Principal/HR/Attendance Admin users.</p>
    </main>
  );
}
