"use client";
import Image from "next/image";
import { UserRound } from "lucide-react";
import { backendMediaUrl } from "@/lib/media";
import { useState } from "react";
import { formatDDMMYYYY, camelCaseText } from "@/lib/table-utils";

export function StudentPhoto({ src, name, large = false }: { src?: string | null; name: string; large?: boolean }) {
  const url = backendMediaUrl(src);
  const [failed, setFailed] = useState<string | null>(null);
  return (
    <div className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 text-slate-400 dark:border-zinc-700 dark:bg-zinc-800 ${large ? "h-16 w-16 sm:h-20 sm:w-20" : "h-10 w-10"}`}>
      {url && failed !== url ? (
        <Image src={url} alt={`${name} photo`} fill unoptimized sizes={large ? "80px" : "40px"} className="object-cover" onError={() => setFailed(url)} />
      ) : (
        <UserRound className={large ? "h-8 w-8 text-slate-400" : "h-5 w-5"} />
      )}
    </div>
  );
}

export function StatusPill({ verified, label }: { verified: boolean; label?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
      verified
        ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900"
        : "bg-amber-50 text-amber-700 border border-amber-200/80 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900"
    }`}>
      {label || (verified ? "Verified" : "Pending verification")}
    </span>
  );
}

export function ProfileSection({
  title,
  children,
  action,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 ${className}`}>
      <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100 dark:border-zinc-800/80">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-zinc-100 tracking-tight">
          {camelCaseText(title)}
        </h2>
        {action && <div>{action}</div>}
      </div>
      {children}
    </section>
  );
}

export const fieldLabel = (key: string) => key.replaceAll("_", " ").replace(/\b\w/g, value => value.toUpperCase());
export const dateText = (value?: string | null) => value ? formatDDMMYYYY(value) : "—";

export function DetailGrid({
  values,
  cols = 2,
  className = "",
}: {
  values: { label: string; value: unknown }[];
  cols?: 2 | 3 | 4;
  className?: string;
}) {
  const display = (value: unknown) =>
    value === null || value === undefined || value === ""
      ? "—"
      : typeof value === "boolean"
      ? value
        ? "Yes"
        : "No"
      : typeof value === "object"
      ? JSON.stringify(value)
      : String(value);

  const colClass =
    cols === 4
      ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-5"
      : cols === 3
      ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6"
      : "grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5";

  return (
    <div className={`grid ${colClass} ${className}`}>
      {values.map((item, index) => (
        <div
          key={`${item.label}-${index}`}
          className="min-w-0 flex flex-col justify-start"
        >
          <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider leading-relaxed">
            {item.label}
          </span>
          <span className="mt-1 break-words text-sm sm:text-base font-semibold text-slate-900 dark:text-zinc-100">
            {display(item.value)}
          </span>
        </div>
      ))}
    </div>
  );
}
