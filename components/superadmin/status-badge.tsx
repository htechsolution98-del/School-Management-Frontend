import { CheckCircle2, Circle } from "lucide-react";

export function StatusBadge({ active = true, label }: { active?: boolean; label?: string }) {
  const Icon = active ? CheckCircle2 : Circle;
  return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-1 text-xs font-medium leading-4 ${active ? "border-[#1D496C]/15 bg-[#1D496C]/5 text-[#1D496C]" : "border-slate-200 bg-slate-50 text-slate-500"}`}>
    <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
    {label ?? (active ? "Active" : "Inactive")}
  </span>;
}
