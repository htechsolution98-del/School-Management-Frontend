"use client";

import React from "react";
import { MobileBottomDrawer } from "./mobile-bottom-drawer";
import { Check, ChevronDown } from "lucide-react";

export interface MobileSelectOption {
  label: string;
  value: string | number;
  count?: number;
  icon?: React.ElementType;
  disabled?: boolean;
}

export interface MobileSelectDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  options: MobileSelectOption[];
  selectedValue: string | number;
  onSelect: (value: any) => void;
}

export function MobileSelectDrawer({
  isOpen,
  onClose,
  title,
  subtitle,
  options,
  selectedValue,
  onSelect,
}: MobileSelectDrawerProps) {
  return (
    <MobileBottomDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={subtitle || "Select an option from the list below"}
    >
      <div className="space-y-2 py-1">
        {options.map((opt) => {
          const isSelected = String(opt.value) === String(selectedValue);
          const Icon = opt.icon;
          return (
            <button
              key={String(opt.value)}
              type="button"
              disabled={opt.disabled}
              onClick={() => {
                if (opt.disabled) return;
                onSelect(opt.value);
                onClose();
              }}
              className={`flex w-full items-center justify-between p-3.5 rounded-2xl text-left font-semibold text-xs sm:text-sm transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                isSelected
                  ? "bg-blue-50 border-2 border-blue-600 text-blue-700 shadow-xs"
                  : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80 active:bg-slate-200"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                {Icon && (
                  <div
                    className={`p-1.5 rounded-lg shrink-0 ${
                      isSelected ? "bg-blue-100 text-blue-600" : "bg-slate-200/70 text-slate-500"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                )}
                <span className={`truncate ${isSelected ? "font-bold text-blue-900" : "font-medium"}`}>
                  {opt.label}
                </span>
                {opt.count !== undefined && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                      isSelected ? "bg-blue-200/60 text-blue-800" : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {opt.count}
                  </span>
                )}
              </div>
              {isSelected && (
                <div className="h-5 w-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <Check className="h-3.5 w-3.5 stroke-[3]" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </MobileBottomDrawer>
  );
}

export function MobileSelectTrigger({
  label,
  valueLabel,
  onClick,
  className = "",
}: {
  label?: string;
  valueLabel: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`md:hidden flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:border-blue-400 active:bg-slate-50 transition-all cursor-pointer ${className}`}
    >
      <span className="truncate">
        {label ? <span className="text-slate-400 font-normal mr-1">{label}:</span> : null}
        {valueLabel}
      </span>
      <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
    </button>
  );
}
