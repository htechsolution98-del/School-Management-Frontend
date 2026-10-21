"use client";

import React, { useState, useEffect } from "react";
import { CalendarDays } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { parseApiDate, toInputDate } from "@/lib/table-utils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function formatDisplayDate(date: Date | null): string {
  if (!date || isNaN(date.getTime())) return "";
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

function parseUserInputDate(input: string): Date | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // 1. DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10);
    const year = parseInt(dmyMatch[3], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 1900 && year <= 2100) {
      const d = new Date(year, month - 1, day);
      if (d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day) {
        return d;
      }
    }
    return null;
  }

  // 2. 8 digits without separator: DDMMYYYY
  const digitsMatch = trimmed.match(/^(\d{2})(\d{2})(\d{4})$/);
  if (digitsMatch) {
    const day = parseInt(digitsMatch[1], 10);
    const month = parseInt(digitsMatch[2], 10);
    const year = parseInt(digitsMatch[3], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 1900 && year <= 2100) {
      const d = new Date(year, month - 1, day);
      if (d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day) {
        return d;
      }
    }
    return null;
  }

  // 3. ISO YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})$/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    const day = parseInt(isoMatch[3], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 1900 && year <= 2100) {
      const d = new Date(year, month - 1, day);
      if (d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day) {
        return d;
      }
    }
    return null;
  }

  return null;
}

export function DatePicker({
  value,
  onChange,
  min,
  max,
  id,
  name,
  disabled,
  required,
  className,
  placeholder = "DD/MM/YYYY",
  disableFuture = false,
  ...aria
}: {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  id?: string;
  name?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  placeholder?: string;
  disableFuture?: boolean;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}) {
  const [open, setOpen] = useState(false);
  const [isInvalid, setIsInvalid] = useState(false);

  const todayStr = toInputDate(new Date());
  // If disableFuture is true, ensure maximum date cannot exceed today
  const effectiveMax = disableFuture
    ? max && max < todayStr
      ? max
      : todayStr
    : max;

  const [inputValue, setInputValue] = useState(() => {
    const parsed = parseApiDate(value);
    return parsed ? formatDisplayDate(parsed) : "";
  });

  // Sync internal text with incoming value prop if it changes externally
  useEffect(() => {
    const parsed = parseApiDate(value);
    const formatted = parsed ? formatDisplayDate(parsed) : "";
    if (formatted !== inputValue) {
      const currentParsed = parseUserInputDate(inputValue);
      if (!currentParsed || toInputDate(currentParsed) !== value) {
        setInputValue(formatted);
        setIsInvalid(false);
      }
    }
  }, [value]);

  const selected = parseApiDate(value) ?? parseUserInputDate(inputValue) ?? undefined;
  const lower = parseApiDate(min) ?? undefined;
  const upper = parseApiDate(effectiveMax) ?? undefined;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value;
    // Allow digits, slashes, dashes, dots
    raw = raw.replace(/[^0-9/.-]/g, "");

    // Auto-insert slashes if user enters 8 consecutive digits (e.g. 17102026 -> 17/10/2026)
    if (/^\d{8}$/.test(raw)) {
      raw = `${raw.slice(0, 2)}/${raw.slice(2, 4)}/${raw.slice(4, 8)}`;
    }

    setInputValue(raw);

    if (!raw.trim()) {
      setIsInvalid(false);
      onChange("");
      return;
    }

    const parsed = parseUserInputDate(raw);
    if (parsed) {
      const next = toInputDate(parsed);
      if (effectiveMax && next > effectiveMax) {
        setIsInvalid(true);
        return;
      }
      if (min && next < min) {
        setIsInvalid(true);
        return;
      }
      setIsInvalid(false);
      onChange(next);
    }
  };

  const handleBlur = () => {
    if (!inputValue.trim()) {
      setInputValue("");
      setIsInvalid(false);
      onChange("");
      return;
    }

    const parsed = parseUserInputDate(inputValue);
    if (parsed) {
      const next = toInputDate(parsed);

      // Disallow future date if effectiveMax is set
      if (effectiveMax && next > effectiveMax) {
        const maxDate = parseApiDate(effectiveMax);
        const displayMax = formatDisplayDate(maxDate);
        setInputValue(displayMax);
        setIsInvalid(false);
        onChange(effectiveMax);
        toast.error(`Future dates cannot be entered. Reverted to ${displayMax}.`);
        return;
      }

      if (min && next < min) {
        const minDate = parseApiDate(min);
        const displayMin = formatDisplayDate(minDate);
        setInputValue(displayMin);
        setIsInvalid(false);
        onChange(min);
        toast.error(`Date cannot be before ${displayMin}.`);
        return;
      }

      setIsInvalid(false);
      setInputValue(formatDisplayDate(parsed));
      onChange(next);
    } else {
      // Revert if invalid or incomplete
      if (value) {
        const prev = parseApiDate(value);
        setInputValue(prev ? formatDisplayDate(prev) : "");
        setIsInvalid(false);
      } else {
        setInputValue("");
        setIsInvalid(false);
        onChange("");
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleBlur();
      setOpen(false);
    }
  };

  return (
    <div
      className={cn(
        "relative flex items-center h-10 min-w-36 rounded-lg border border-slate-200 bg-white shadow-2xs transition-all focus-within:border-[#2563EB] focus-within:ring-2 focus-within:ring-[#2563EB]/20",
        isInvalid && "border-rose-400 focus-within:border-rose-500 focus-within:ring-rose-200",
        className,
        // Override any padding applied on container so inner input sits cleanly
        "!p-0"
      )}
    >
      <input
        type="text"
        id={id}
        name={name}
        inputMode="numeric"
        placeholder={placeholder}
        maxLength={10}
        disabled={disabled}
        required={required}
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        aria-required={required}
        aria-invalid={isInvalid || aria["aria-invalid"]}
        {...aria}
        className="h-full w-full bg-transparent border-0 outline-none pl-3 pr-9 text-sm text-slate-800 placeholder:text-slate-400 disabled:cursor-not-allowed font-mono transition-colors"
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          type="button"
          disabled={disabled}
          aria-label="Open calendar"
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-[#2563EB] disabled:cursor-not-allowed disabled:opacity-50 transition-colors focus:outline-none"
        >
          <CalendarDays className="h-4 w-4" />
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selected}
            defaultMonth={selected ?? upper ?? new Date()}
            captionLayout="dropdown"
            startMonth={lower ?? new Date(1900, 0, 1)}
            endMonth={upper ?? (disableFuture ? new Date() : new Date(new Date().getFullYear() + 20, 11, 31))}
            disabled={[
              ...(lower ? [{ before: lower }] : []),
              ...(upper ? [{ after: upper }] : (disableFuture ? [{ after: new Date() }] : [])),
            ]}
            onSelect={(date) => {
              if (!date) return;
              const next = toInputDate(date);
              if (effectiveMax && next > effectiveMax) {
                toast.error("Future dates cannot be selected.");
                return;
              }
              if (min && next < min) {
                toast.error(`Date cannot be before ${formatDisplayDate(lower ?? null)}.`);
                return;
              }
              setInputValue(formatDisplayDate(date));
              setIsInvalid(false);
              onChange(next);
              setOpen(false);
            }}
          />
          {!required && (
            <div className="border-t border-slate-100 p-2 flex justify-end bg-slate-50/50">
              <button
                type="button"
                onClick={() => {
                  setInputValue("");
                  setIsInvalid(false);
                  onChange("");
                  setOpen(false);
                }}
                className="text-xs font-medium text-slate-500 hover:text-rose-600 px-2 py-1 rounded hover:bg-slate-100 transition-colors"
              >
                Clear date
              </button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
