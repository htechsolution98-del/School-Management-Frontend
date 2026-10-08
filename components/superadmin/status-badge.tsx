import { CheckCircle2, Circle } from "lucide-react";

export function StatusBadge({ active = true, label }: { active?: boolean; label?: string }) {
  const Icon = active ? CheckCircle2 : Circle;
  return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 py-1 text-xs font-semibold leading-4 ${active ? "border-indigo-200 bg-indigo-50 text-[#5826df]" : "border-slate-200 bg-slate-50 text-slate-500"}`}>
    <Icon className="h-3.5 w-3.5 shrink-0 text-[#5826df]" aria-hidden="true" />
    {label ?? (active ? "Active" : "Inactive")}
  </span>;
}
