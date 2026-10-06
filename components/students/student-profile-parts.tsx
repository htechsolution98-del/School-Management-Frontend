"use client";
import Image from "next/image";
import { UserRound } from "lucide-react";
import { backendMediaUrl } from "@/lib/media";
import { useState } from "react";
import { formatDDMMYYYY, camelCaseText } from "@/lib/table-utils";

export function StudentPhoto({ src, name, large = false }: { src?: string | null; name: string; large?: boolean }) {
  const url = backendMediaUrl(src); const [failed, setFailed] = useState<string | null>(null);
  return <div className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 text-slate-400 dark:border-zinc-700 dark:bg-zinc-800 ${large ? "h-24 w-24" : "h-10 w-10"}`}>
    {url && failed !== url ? <Image src={url} alt={`${name} photo`} fill unoptimized sizes={large ? "96px" : "40px"} className="object-cover" onError={() => setFailed(url)} /> : <UserRound className={large ? "h-10 w-10" : "h-5 w-5"} />}
  </div>;
}
export function StatusPill({ verified, label }: { verified: boolean; label?: string }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${verified ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"}`}>{label || (verified ? "Verified" : "Pending verification")}</span>;
}
export function ProfileSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-6"><h2 className="mb-5 text-base font-semibold text-slate-900 dark:text-zinc-100">{camelCaseText(title)}</h2>{children}</section>;
}
export const fieldLabel = (key: string) => key.replaceAll("_", " ").replace(/\b\w/g, value => value.toUpperCase());
export const dateText = (value?: string | null) => value ? formatDDMMYYYY(value) : "Not recorded";
export function DetailGrid({ values }: { values: { label: string; value: unknown }[] }) {
  const display = (value: unknown) => value === null || value === undefined || value === "" ? "Not recorded" : typeof value === "boolean" ? value ? "Yes" : "No" : typeof value === "object" ? JSON.stringify(value) : String(value);
  return <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">{values.map((item, index) => <div key={`${item.label}-${index}`} className="min-w-0 rounded-xl bg-slate-50/80 p-3 dark:bg-zinc-800/50"><dt className="text-xs font-medium text-slate-500 dark:text-zinc-400">{item.label}</dt><dd className="mt-1.5 break-words text-sm font-medium text-slate-800 dark:text-zinc-200">{display(item.value)}</dd></div>)}</dl>;
}
