"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { MobileBottomDrawer } from "@/components/ui/mobile-bottom-drawer";
import { cn } from "@/lib/utils";

type Option = { value: string; label: string; disabled: boolean };
type Props = Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "onChange"> & {
  onChange?: (event: { target: { value: string }; currentTarget: { value: string } }) => void;
  drawerTitle?: string;
  drawerSubtitle?: string;
};

function optionText(node: React.ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(optionText).join("");
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) return optionText(node.props.children);
  return "";
}

function collectOptions(children: React.ReactNode): Option[] {
  return React.Children.toArray(children).flatMap((child) => {
    if (!React.isValidElement<{ value?: string | number; disabled?: boolean; children?: React.ReactNode }>(child)) return [];
    if (child.type === "option") {
      return [{
        value: String(child.props.value ?? optionText(child.props.children)),
        label: optionText(child.props.children).trim(),
        disabled: Boolean(child.props.disabled),
      }];
    }
    return collectOptions(child.props.children);
  });
}

export default function ResponsiveSelect({
  children,
  value,
  defaultValue,
  onChange,
  className,
  disabled,
  id,
  "aria-label": ariaLabel,
  drawerTitle = "Select an option",
  drawerSubtitle,
  ...selectProps
}: Props) {
  const [open, setOpen] = React.useState(false);
  const options = React.useMemo(() => collectOptions(children), [children]);
  const selectedValue = String(value ?? defaultValue ?? "");
  const selectedOption = options.find((option) => option.value === selectedValue);

  const selectValue = (nextValue: string) => {
    onChange?.({ target: { value: nextValue }, currentTarget: { value: nextValue } });
  };

  return (
    <>
      <select
        {...selectProps}
        id={id}
        aria-label={ariaLabel}
        value={value}
        defaultValue={value === undefined ? defaultValue : undefined}
        onChange={(event) => selectValue(event.target.value)}
        disabled={disabled}
        className={cn(className, "hidden md:block")}
      >
        {children}
      </select>
      <button
        type="button"
        id={id ? `${id}-mobile` : undefined}
        aria-label={ariaLabel || drawerTitle}
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={cn(
          "md:hidden inline-flex min-h-10 items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-xs font-bold text-slate-700 shadow-2xs",
          className
        )}
      >
        <span className="min-w-0 flex-1 truncate">{selectedOption?.label || "Select an option"}</span>
        {!className?.includes("appearance-none") && <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />}
      </button>
      <MobileBottomDrawer
        isOpen={open}
        onClose={() => setOpen(false)}
        title={drawerTitle}
        subtitle={drawerSubtitle || "Choose an option from the list"}
      >
        <div className="space-y-2 py-1">
          {options.map((option) => {
            const selected = option.value === selectedValue;
            return (
              <button
                key={`${option.value}-${option.label}`}
                type="button"
                disabled={option.disabled}
                onClick={() => {
                  selectValue(option.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-2xl border p-3.5 text-left text-sm transition-colors disabled:opacity-40",
                  selected
                    ? "border-blue-600 bg-blue-50 font-bold text-blue-800"
                    : "border-slate-200 bg-white font-medium text-slate-700 hover:bg-slate-50"
                )}
              >
                <span>{option.label}</span>
                {selected && <span aria-hidden="true" className="ml-3 text-blue-600">✓</span>}
              </button>
            );
          })}
        </div>
      </MobileBottomDrawer>
    </>
  );
}
