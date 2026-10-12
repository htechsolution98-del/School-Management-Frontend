"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

export interface KpiCardProps {
  label: string;
  value: number | string;
  formattedValue?: string;
  detail: string;
  icon: LucideIcon;
  badge?: {
    text: string;
    variant?: "success" | "warning" | "error" | "neutral";
  };
  trendPercent?: number | null;
  trendLabel?: string;
  progressPercent?: number | null;
  loading?: boolean;
  currency?: boolean;
}

export function KpiCard({
  label,
  value,
  formattedValue,
  detail,
  icon: Icon,
  badge,
  trendPercent,
  trendLabel,
  progressPercent,
  loading = false,
  currency = false,
}: KpiCardProps) {
  const reduceMotion = useReducedMotion();

  const displayVal = (() => {
    if (loading) return "—";
    if (formattedValue) return formattedValue;
    if (typeof value === "number") {
      const numStr = value.toLocaleString("en-IN");
      return currency ? `₹${numStr}` : numStr;
    }
    return String(value);
  })();

  const badgeStyles = {
    success: "bg-emerald-50 text-emerald-800 border-emerald-200/60",
    warning: "bg-amber-50 text-amber-800 border-amber-200/60",
    error: "bg-red-50 text-red-800 border-red-200/60",
    neutral: "bg-[#F7F8F5] text-[#202923] border-[#E5EAE5]",
  };

  return (
    <motion.div
      initial={{ opacity: reduceMotion ? 1 : 0, y: reduceMotion ? 0 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={reduceMotion ? undefined : { y: -2 }}
      transition={{ duration: 0.25 }}
      className="relative rounded-2xl border border-[#E5EAE5] bg-white p-5 shadow-xs transition-shadow duration-200 hover:shadow-md cursor-default flex flex-col justify-between"
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-[#687568]">
            {label}
          </span>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[#16834A] ring-1 ring-[#16834A]/15">
            <Icon className="h-5 w-5" />
          </div>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-black tracking-tight text-[#202923] tabular-nums">
            {displayVal}
          </span>
          {badge && (
            <span
              className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold ${
                badgeStyles[badge.variant || "neutral"]
              }`}
            >
              {badge.text}
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-[#E5EAE5]/60">
        {progressPercent !== null && progressPercent !== undefined && (
          <div className="mb-2">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#E5EAE5]">
              <div
                className="h-full rounded-full bg-[#16834A] transition-all duration-500"
                style={{ width: `${Math.min(Math.max(progressPercent, 0), 100)}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-[#687568]">
          <span className="truncate font-medium">{loading ? "Loading metrics…" : detail}</span>
          {trendPercent !== null && trendPercent !== undefined && (
            <span
              className={`shrink-0 font-bold ml-2 ${
                trendPercent >= 0 ? "text-[#16A34A]" : "text-[#DC2626]"
              }`}
            >
              {trendPercent >= 0 ? "+" : ""}
              {trendPercent}% {trendLabel || ""}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
