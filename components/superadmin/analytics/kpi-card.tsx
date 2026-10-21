"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

export type KpiColorScheme = "indigo" | "emerald" | "sky" | "purple" | "amber" | "rose";

export interface KpiCardProps {
  label: string;
  value: number | string;
  formattedValue?: string;
  detail: string;
  icon: LucideIcon;
  badge?: {
    text: string;
    variant?: "success" | "warning" | "error" | "neutral" | "primary" | "info" | "purple";
  };
  trendPercent?: number | null;
  trendLabel?: string;
  progressPercent?: number | null;
  loading?: boolean;
  currency?: boolean;
  colorScheme?: KpiColorScheme;
}

const COLOR_CONFIGS: Record<
  KpiColorScheme,
  {
    iconBg: string;
    iconText: string;
    ring: string;
    progress: string;
    badgeDefault: string;
    topStripe: string;
    cardBorderHover: string;
  }
> = {
  indigo: {
    iconBg: "bg-blue-50",
    iconText: "text-blue-600",
    ring: "ring-blue-500/20",
    progress: "bg-blue-600",
    badgeDefault: "bg-blue-50 text-blue-700 border-blue-200/70",
    topStripe: "from-blue-500 to-blue-600",
    cardBorderHover: "hover:border-blue-200",
  },
  emerald: {
    iconBg: "bg-emerald-50",
    iconText: "text-emerald-600",
    ring: "ring-emerald-500/20",
    progress: "bg-emerald-500",
    badgeDefault: "bg-emerald-50 text-emerald-700 border-emerald-200/70",
    topStripe: "from-emerald-400 to-emerald-600",
    cardBorderHover: "hover:border-emerald-200",
  },
  sky: {
    iconBg: "bg-sky-50",
    iconText: "text-sky-600",
    ring: "ring-sky-500/20",
    progress: "bg-sky-500",
    badgeDefault: "bg-sky-50 text-sky-700 border-sky-200/70",
    topStripe: "from-sky-400 to-blue-600",
    cardBorderHover: "hover:border-sky-200",
  },
  purple: {
    iconBg: "bg-blue-50",
    iconText: "text-blue-600",
    ring: "ring-blue-500/20",
    progress: "bg-blue-600",
    badgeDefault: "bg-blue-50 text-blue-700 border-blue-200/70",
    topStripe: "from-blue-400 to-blue-600",
    cardBorderHover: "hover:border-blue-200",
  },
  amber: {
    iconBg: "bg-amber-50",
    iconText: "text-amber-600",
    ring: "ring-amber-500/20",
    progress: "bg-amber-500",
    badgeDefault: "bg-amber-50 text-amber-800 border-amber-200/70",
    topStripe: "from-amber-400 to-orange-500",
    cardBorderHover: "hover:border-amber-200",
  },
  rose: {
    iconBg: "bg-rose-50",
    iconText: "text-rose-600",
    ring: "ring-rose-500/20",
    progress: "bg-rose-500",
    badgeDefault: "bg-rose-50 text-rose-700 border-rose-200/70",
    topStripe: "from-rose-400 to-pink-600",
    cardBorderHover: "hover:border-rose-200",
  },
};

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
  colorScheme = "indigo",
}: KpiCardProps) {
  const reduceMotion = useReducedMotion();
  const theme = COLOR_CONFIGS[colorScheme] || COLOR_CONFIGS.indigo;

  const displayVal = (() => {
    if (loading) return "—";
    if (formattedValue) return formattedValue;
    if (typeof value === "number") {
      const numStr = value.toLocaleString("en-IN");
      return currency ? `₹${numStr}` : numStr;
    }
    return String(value);
  })();

  const badgeStyles: Record<string, string> = {
    primary: "bg-blue-50 text-blue-700 border-blue-200/70",
    info: "bg-sky-50 text-sky-700 border-sky-200/70",
    purple: "bg-blue-50 text-blue-700 border-blue-200/70",
    success: "bg-emerald-50 text-emerald-800 border-emerald-200/70",
    warning: "bg-amber-50 text-amber-800 border-amber-200/70",
    error: "bg-rose-50 text-rose-800 border-rose-200/70",
    neutral: "bg-slate-100 text-slate-700 border-slate-200",
  };

  const badgeClass = badge
    ? badge.variant
      ? badgeStyles[badge.variant] || badgeStyles.neutral
      : theme.badgeDefault
    : "";

  return (
    <motion.div
      initial={{ opacity: reduceMotion ? 1 : 0, y: reduceMotion ? 0 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={reduceMotion ? undefined : { y: -2 }}
      transition={{ duration: 0.2 }}
      className={`relative rounded-2xl border border-slate-200/90 bg-white p-4.5 shadow-xs transition-all duration-200 hover:shadow-md cursor-default flex flex-col justify-between overflow-hidden group ${theme.cardBorderHover}`}
    >
      {/* Top micro accent stripe */}
      <div
        className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${theme.topStripe} opacity-85 group-hover:opacity-100 transition-opacity`}
      />

      <div className="min-w-0 pt-0.5">
        <div className="flex items-center justify-between gap-1.5 mb-2.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 truncate">
            {label}
          </span>
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${theme.iconBg} ${theme.iconText} ring-1 ${theme.ring} shadow-2xs`}
          >
            <Icon className="h-4.5 w-4.5" />
          </div>
        </div>

        <div className="flex flex-wrap items-baseline justify-between gap-1">
          <span className="text-xl sm:text-2xl 2xl:text-3xl font-black tracking-tight text-slate-900 tabular-nums truncate max-w-full">
            {displayVal}
          </span>
          {badge && (
            <span
              className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[9px] font-bold shrink-0 ${badgeClass}`}
            >
              {badge.text}
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-100">
        {progressPercent !== null && progressPercent !== undefined && (
          <div className="mb-2">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${theme.progress} transition-all duration-500`}
                style={{ width: `${Math.min(Math.max(progressPercent, 0), 100)}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-slate-500 min-w-0">
          <span className="truncate min-w-0 font-medium">{loading ? "Loading metrics…" : detail}</span>
          {trendPercent !== null && trendPercent !== undefined && (
            <span
              className={`shrink-0 font-bold ml-2 ${
                trendPercent >= 0 ? "text-emerald-600" : "text-rose-600"
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
