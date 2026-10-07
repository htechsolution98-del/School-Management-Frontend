"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDDMMYYYY, parseApiDate, toInputDate } from "@/lib/table-utils";
import { cn } from "@/lib/utils";

export function DatePicker({ value, onChange, min, max, id, disabled, required, className, ...aria }: {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  id?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = parseApiDate(value) ?? undefined;
  const lower = parseApiDate(min) ?? undefined;
  const upper = parseApiDate(max) ?? undefined;
  return <Popover open={open} onOpenChange={setOpen}>
    {required && <input aria-hidden="true" tabIndex={-1} className="sr-only" value={value} onChange={() => {}} required disabled={disabled} onInvalid={event => { event.preventDefault(); setOpen(true); }} />}
    <PopoverTrigger type="button" id={id} disabled={disabled} aria-required={required} {...aria} className={cn("flex h-10 min-w-36 items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 text-left text-sm text-slate-600 disabled:opacity-50", className)}>
      <span>{selected ? formatDDMMYYYY(selected) : "DD/MM/YYYY"}</span><CalendarDays aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400" />
    </PopoverTrigger>
    <PopoverContent className="w-auto gap-0 p-0" align="start">
      <Calendar mode="single" selected={selected} defaultMonth={selected ?? upper ?? new Date()} captionLayout="dropdown" startMonth={lower ?? new Date(1900, 0, 1)} endMonth={upper ?? new Date(new Date().getFullYear() + 20, 11, 31)} disabled={[...(lower ? [{ before: lower }] : []), ...(upper ? [{ after: upper }] : [])]} onSelect={date => {
        if (!date) return;
        const next = toInputDate(date);
        if ((min && next < min) || (max && next > max)) return;
        onChange(next); setOpen(false);
      }} />
      {!required && <button type="button" onClick={() => { onChange(""); setOpen(false); }} className="border-t border-slate-100 p-2 text-xs text-slate-500 hover:bg-slate-50">Clear date</button>}
    </PopoverContent>
  </Popover>;
}
