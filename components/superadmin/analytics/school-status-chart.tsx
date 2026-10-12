"use client";

import React from "react";
import { CheckCircle2 } from "lucide-react";

interface SchoolStatusChartProps {
  totalSchools: number;
  activeSchools: number;
  inactiveSchools: number;
  suspendedSchools?: number;
  loading?: boolean;
}

export function SchoolStatusChart({
  totalSchools,
  activeSchools,
  inactiveSchools,
  suspendedSchools = 0,
  loading = false,
}: SchoolStatusChartProps) {
  const activationRate =
    totalSchools > 0 ? Math.round((activeSchools / totalSchools) * 100) : 0;

  // SVG Donut calculation
  const radius = 46;
  const circumference = 2 * Math.PI * radius;

  const activeFraction = totalSchools > 0 ? activeSchools / totalSchools : 0;
  const inactiveFraction = totalSchools > 0 ? inactiveSchools / totalSchools : 0;
  const suspendedFraction = totalSchools > 0 ? suspendedSchools / totalSchools : 0;

  const activeStroke = activeFraction * circumference;
  const inactiveStroke = inactiveFraction * circumference;
  const suspendedStroke = suspendedFraction * circumference;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 shadow-2xs">
            <CheckCircle2 className="h-4 w-4" />
          </span>
          <h3 className="text-base font-bold text-slate-900">School Status</h3>
        </div>
        <p className="text-xs text-slate-500">
          Institutional instance health and licensing state
        </p>

        {loading ? (
          <div className="flex h-52 items-center justify-center text-xs text-slate-500">
            Loading school status…
          </div>
        ) : totalSchools === 0 ? (
          <div className="flex h-52 items-center justify-center text-xs text-slate-500">
            No registered schools found.
          </div>
        ) : (
          <div className="my-6 flex flex-col items-center">
            {/* Donut SVG */}
            <div className="relative h-44 w-44">
              <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                <circle
                  cx="60"
                  cy="60"
                  r={radius}
                  fill="none"
                  stroke="#F1F5F9"
                  strokeWidth="14"
                />
                {/* Active schools stroke */}
                <circle
                  cx="60"
                  cy="60"
                  r={radius}
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="14"
                  strokeDasharray={`${activeStroke} ${circumference}`}
                  strokeDashoffset="0"
                  className="transition-all duration-500"
                />
                {/* Inactive schools stroke */}
                {inactiveStroke > 0 && (
                  <circle
                    cx="60"
                    cy="60"
                    r={radius}
                    fill="none"
                    stroke="#EF4444"
                    strokeWidth="14"
                    strokeDasharray={`${inactiveStroke} ${circumference}`}
                    strokeDashoffset={`-${activeStroke}`}
                    className="transition-all duration-500"
                  />
                )}
                {/* Suspended stroke */}
                {suspendedStroke > 0 && (
                  <circle
                    cx="60"
                    cy="60"
                    r={radius}
                    fill="none"
                    stroke="#F59E0B"
                    strokeWidth="14"
                    strokeDasharray={`${suspendedStroke} ${circumference}`}
                    strokeDashoffset={`-${activeStroke + inactiveStroke}`}
                    className="transition-all duration-500"
                  />
                )}
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-slate-900 tabular-nums">
                  {activationRate}%
                </span>
                <span className="mt-0.5 text-xs font-bold text-slate-500">
                  Activation Rate
                </span>
              </div>
            </div>

            {/* Legend & Breakdown */}
            <div className="mt-4 flex flex-wrap justify-center gap-5 text-xs">
              <span className="flex items-center gap-1.5 font-bold text-slate-700">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                Active: <strong>{activeSchools}</strong>
              </span>
              <span className="flex items-center gap-1.5 font-bold text-slate-700">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                Inactive: <strong>{inactiveSchools}</strong>
              </span>
              {suspendedSchools > 0 && (
                <span className="flex items-center gap-1.5 font-bold text-slate-700">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                  Suspended: <strong>{suspendedSchools}</strong>
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
        <span>Verified tenant activation</span>
        <span className="font-bold text-slate-900">{totalSchools} Registered Instances</span>
      </div>
    </div>
  );
}
