"use client";

import React from "react";
import { PieChart as PieIcon, ShieldAlert } from "lucide-react";
import type { ClassDistributionItem } from "./types";

interface DemographicsChartProps {
  totalStudents: number;
  boys: number;
  girls: number;
  otherGender?: number;
  rteStudents?: number;
  classDistribution?: ClassDistributionItem[];
  loading?: boolean;
}

export function DemographicsChart({
  totalStudents,
  boys,
  girls,
  otherGender = 0,
  rteStudents = 0,
  classDistribution = [],
  loading = false,
}: DemographicsChartProps) {
  // Percentages
  const boysPct = totalStudents > 0 ? Math.round((boys / totalStudents) * 100) : 0;
  const girlsPct = totalStudents > 0 ? Math.round((girls / totalStudents) * 100) : 0;
  const otherPct =
    totalStudents > 0 ? Math.max(0, 100 - boysPct - girlsPct) : 0;
  const rtePct = totalStudents > 0 ? Math.round((rteStudents / totalStudents) * 100) : 0;

  // Donut SVG circumference and stroke calculation
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const boysStroke = totalStudents > 0 ? (boys / totalStudents) * circumference : 0;
  const girlsStroke = totalStudents > 0 ? (girls / totalStudents) * circumference : 0;
  const otherStroke = totalStudents > 0 ? (otherGender / totalStudents) * circumference : 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between h-full">
      <div className="flex-1 flex flex-col">
        <div className="shrink-0 flex items-center justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 text-sky-600 shadow-2xs">
                <PieIcon className="h-4 w-4" />
              </span>
              <h3 className="text-base font-bold text-slate-900">Student Demographics</h3>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              Gender balance, RTE quota entitlement, and class distribution
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex h-56 items-center justify-center text-xs text-slate-500">
            Loading demographics…
          </div>
        ) : totalStudents === 0 ? (
          <div className="flex h-56 items-center justify-center text-xs text-slate-500">
            No enrolled students to analyze.
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 items-center">
            {/* Donut Chart: Gender */}
            <div className="flex flex-col items-center">
              <div className="relative h-40 w-40">
                <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                  <circle
                    cx="60"
                    cy="60"
                    r={radius}
                    fill="none"
                    stroke="#F1F5F9"
                    strokeWidth="14"
                  />
                  {/* Boys segment */}
                  <circle
                    cx="60"
                    cy="60"
                    r={radius}
                    fill="none"
                    stroke="#0284C7"
                    strokeWidth="14"
                    strokeDasharray={`${boysStroke} ${circumference}`}
                    strokeDashoffset="0"
                    className="transition-all duration-500"
                  />
                  {/* Girls segment */}
                  <circle
                    cx="60"
                    cy="60"
                    r={radius}
                    fill="none"
                    stroke="#F43F5E"
                    strokeWidth="14"
                    strokeDasharray={`${girlsStroke} ${circumference}`}
                    strokeDashoffset={`-${boysStroke}`}
                    className="transition-all duration-500"
                  />
                  {/* Other segment */}
                  {otherStroke > 0 && (
                    <circle
                      cx="60"
                      cy="60"
                      r={radius}
                      fill="none"
                      stroke="#A855F7"
                      strokeWidth="14"
                      strokeDasharray={`${otherStroke} ${circumference}`}
                      strokeDashoffset={`-${boysStroke + girlsStroke}`}
                      className="transition-all duration-500"
                    />
                  )}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-black text-slate-900 tabular-nums">
                    {totalStudents.toLocaleString("en-IN")}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Students
                  </span>
                </div>
              </div>

              {/* Legend */}
              <div className="mt-3 flex flex-wrap justify-center gap-4 text-xs">
                <span className="flex items-center gap-1.5 font-bold text-slate-800">
                  <span className="h-2.5 w-2.5 rounded-full bg-sky-600" />
                  Boys: <strong>{boys}</strong> ({boysPct}%)
                </span>
                <span className="flex items-center gap-1.5 font-bold text-slate-800">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                  Girls: <strong>{girls}</strong> ({girlsPct}%)
                </span>
                {otherGender > 0 && (
                  <span className="flex items-center gap-1.5 font-bold text-slate-600">
                    <span className="h-2.5 w-2.5 rounded-full bg-purple-500" />
                    Other: <strong>{otherGender}</strong>
                  </span>
                )}
              </div>
            </div>

            {/* Right Column: RTE Status & Top Classes */}
            <div className="space-y-4">
              {/* RTE quota card */}
              <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-3.5 shadow-2xs">
                <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                  <span className="text-amber-900 flex items-center gap-1.5">
                    <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
                    RTE Quota Students
                  </span>
                  <span className="text-amber-800">{rteStudents} ({rtePct}%)</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-amber-200/60">
                  <div
                    className="h-full rounded-full bg-amber-500"
                    style={{ width: `${rtePct}%` }}
                  />
                </div>
                <div className="mt-1.5 flex justify-between text-[11px] text-amber-800/80">
                  <span>Regular: {totalStudents - rteStudents}</span>
                  <span>RTE: {rteStudents}</span>
                </div>
              </div>

              {/* Class distribution */}
              {classDistribution.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Top Classes Distribution
                  </h4>
                  <div className="space-y-1.5">
                    {classDistribution.slice(0, 4).map((c, i) => {
                      const cPct = Math.round((c.students / totalStudents) * 100);
                      return (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <span className="w-16 truncate font-medium text-slate-800">
                            {c.class_name}
                          </span>
                          <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                            <div
                              className="h-full rounded-full bg-indigo-600"
                              style={{ width: `${cPct}%` }}
                            />
                          </div>
                          <span className="w-8 text-right font-bold text-slate-500 tabular-nums">
                            {c.students}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
        <span>Cross-institutional demographic balance</span>
        <span className="font-bold text-slate-900">{totalStudents} Total Enrolled</span>
      </div>
    </div>
  );
}
