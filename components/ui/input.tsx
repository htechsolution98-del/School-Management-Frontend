"use client";

import * as React from "react"
import { cn } from "@/lib/utils"
import { DatePicker } from "@/components/ui/date-picker"

function Input({ className, type, suppressHydrationWarning = true, ...props }: React.ComponentProps<"input">) {
  if (type === "date") {
    const stringVal = props.value != null ? String(props.value) : "";
    return (
      <DatePicker
        id={props.id}
        name={props.name}
        className={className}
        disabled={props.disabled}
        required={props.required}
        placeholder={props.placeholder || "DD/MM/YYYY"}
        value={stringVal}
        min={props.min != null ? String(props.min) : undefined}
        max={props.max != null ? String(props.max) : undefined}
        aria-label={props["aria-label"]}
        aria-invalid={props["aria-invalid"] === true || props["aria-invalid"] === "true" ? true : undefined}
        aria-describedby={props["aria-describedby"]}
        onChange={(val: string) => {
          if (props.onChange) {
            const syntheticEvent = {
              target: { value: val, name: props.name, id: props.id },
              currentTarget: { value: val, name: props.name, id: props.id },
              preventDefault() {},
              stopPropagation() {},
            } as unknown as React.ChangeEvent<HTMLInputElement>;
            props.onChange(syntheticEvent);
          }
        }}
      />
    );
  }

  return (
    <input
      type={type}
      data-slot="input"
      suppressHydrationWarning={suppressHydrationWarning}
      className={cn(
        "h-10 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-2xs transition-all outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-slate-900 placeholder:text-slate-400 focus-visible:border-[#5826df] focus-visible:ring-3 focus-visible:ring-[#5826df]/20 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
        className
      )}
      {...props}
    />
  )
}

export { Input }
