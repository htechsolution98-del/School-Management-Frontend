"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getSchoolDetails, type SchoolDetailedStats } from "@/lib/superadmin";
import type { School } from "@/types/superadmin";

export function SchoolDetails({ school, onClose }: { school: School | null; onClose: () => void }) {
  const [result, setResult] = useState<{ id: number; data?: SchoolDetailedStats; error?: string } | null>(null);
  useEffect(() => {
    if (!school?.id) return;
    let active = true;
    const id = school.id;
    getSchoolDetails(id).then(data => {
      if (active) setResult({ id, data });
    }).catch(error => {
      if (active) setResult({ id, error: error instanceof Error ? error.message : "Unable to load school details." });
    });
    return () => { active = false; };
  }, [school?.id]);
  const current = result?.id === school?.id ? result : null;
  const data = current?.data;
  return <Dialog open={!!school} onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent className="admin-scroll-area max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-3xl">
      <DialogHeader><DialogTitle>School details</DialogTitle><DialogDescription>{school?.name}</DialogDescription></DialogHeader>
      {!current && <p className="flex items-center gap-2 py-8 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Loading school details…</p>}
      {current?.error && <p role="alert" className="text-sm text-red-600">{current.error}</p>}
      {data && <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Students", data.metrics.total_students], ["Boys", data.metrics.total_boys],
            ["Girls", data.metrics.total_girls], ["RTE students", data.metrics.rte_students],
            ["Staff", data.metrics.total_staff], ["Active staff", data.metrics.active_staff],
            ["Teachers", data.metrics.teachers_count], ["Support staff", data.metrics.non_teaching_count],
          ].map(([label, value]) => <div key={label} className="rounded-lg border border-slate-200 p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p></div>)}
        </div>
        <p className="text-sm text-slate-600">{data.school.email} · {data.school.phone}</p>
        <p className="text-sm text-slate-600">Teacher to student ratio: {data.metrics.teachers_count ? `1 : ${Math.round(data.metrics.total_students / data.metrics.teachers_count)}` : "No teachers assigned"}</p>
        <section><h3 className="mb-2 font-semibold">Classes</h3><div className="grid gap-2 sm:grid-cols-3">{data.classes.map(item => <div key={item.id} className="rounded-lg border border-slate-200 p-3 text-sm"><p className="font-medium">{item.name}</p><p>{item.total_students} students</p><p className="text-xs text-slate-500">{item.boys} boys · {item.girls} girls</p></div>)}</div></section>
        <section><h3 className="mb-2 font-semibold">Staff</h3><div className="divide-y divide-slate-200">{data.staff.map(item => <div key={item.id} className="flex justify-between gap-3 py-2 text-sm"><div><p>{item.name}</p><p className="text-xs text-slate-500">{item.email} · {item.mobile}</p></div><span>{item.category} · {item.is_active ? "Active" : "Inactive"}</span></div>)}</div></section>
        <section><h3 className="mb-2 font-semibold">Feature access</h3><div className="flex flex-wrap gap-2">{data.features.map(item => <span key={item.id} className="rounded-lg border border-slate-200 px-3 py-1 text-xs">{item.name} · {item.is_enabled ? "Enabled" : "Disabled"}</span>)}</div></section>
      </div>}
    </DialogContent>
  </Dialog>;
}
