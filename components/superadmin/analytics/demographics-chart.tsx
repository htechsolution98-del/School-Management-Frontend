"use client";

import React from "react";
import { Users, PieChart as PieIcon, ShieldAlert } from "lucide-react";

interface DemographicsChartProps {
  totalStudents: number;
  boys: number;
  girls: number;
  otherGender: number;
  rteStudents?: number;
  regularStudents?: number;
  classDistribution?: { class_name: string; students: number }[];
  loading?: boolean;
}

export function DemographicsChart({
  totalStudents,
  boys,
  girls,
  otherGender,
  rteStudents = 0,
  regularStudents = 0,
  classDistribution = [],
  loading = false,
}: DemographicsChartProps) {
  const boysPct = totalStudents > 0 ? Math.round((boys / totalStudents) * 100) : 0;
  const girlsPct = totalStudents > 0 ? Math.round((girls / totalStudents) * 100) : 0;
  const otherPct = Math.max(0, 100 - boysPct - girlsPct);

  const rtePct = totalStudents > 0 ? Math.round((rteStudents / totalStudents) * 100) : 0;

  // Donut geometry (circumference ~ 283)
  const radius = 45;
  const circumference = 2 * Math.PI * radius; // 282.74

  const boysStroke = (boysPct / 100) * circumference;
  const girlsStroke = (girlsPct / 100) * circumference;
  const otherStroke = (otherPct / 100) * circumference;

  return (
    <div className="rounded-2xl border border-[#E5EAE5] bg-white p-6 shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-[#16834A]">
                <PieIcon className="h-4 w-4" />
              </span>
              <h3 className="text-base font-bold text-[#202923]">Student Demographics</h3>
            </div>
            <p className="mt-0.5 text-xs text-[#687568]">
              Gender balance, RTE quota entitlement, and class distribution
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex h-56 items-center justify-center text-xs text-[#687568]">
            Loading demographics…
          </div>
        ) : totalStudents === 0 ? (
          <div className="flex h-56 items-center justify-center text-xs text-[#687568]">
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
                    stroke="#F7F8F5"
                    strokeWidth="14"
                  />
                  {/* Boys segment */}
                  <circle
                    cx="60"
                    cy="60"
                    r={radius}
                    fill="none"
                    stroke="#16834A"
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
                    stroke="#34D399"
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
                      stroke="#9CA3AF"
                      strokeWidth="14"
                      strokeDasharray={`${otherStroke} ${circumference}`}
                      strokeDashoffset={`-${boysStroke + girlsStroke}`}
                      className="transition-all duration-500"
                    />
                  )}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-black text-[#202923] tabular-nums">
                    {totalStudents.toLocaleString("en-IN")}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#687568]">
                    Students
                  </span>
                </div>
              </div>

              {/* Legend */}
              <div className="mt-3 flex flex-wrap justify-center gap-4 text-xs">
                <span className="flex items-center gap-1.5 font-bold text-[#202923]">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#16834A]" />
                  Boys: <strong>{boys}</strong> ({boysPct}%)
                </span>
                <span className="flex items-center gap-1.5 font-bold text-[#202923]">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#34D399]" />
                  Girls: <strong>{girls}</strong> ({girlsPct}%)
                </span>
                {otherGender > 0 && (
                  <span className="flex items-center gap-1.5 font-bold text-[#687568]">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#9CA3AF]" />
                    Other: <strong>{otherGender}</strong>
                  </span>
                )}
              </div>
            </div>

            {/* Right Column: RTE Status & Top Classes */}
            <div className="space-y-4">
              {/* RTE quota card */}
              <div className="rounded-xl border border-[#E5EAE5] bg-[#F7F8F5] p-3.5">
                <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                  <span className="text-[#202923] flex items-center gap-1.5">
                    <ShieldAlert className="h-3.5 w-3.5 text-[#16834A]" />
                    RTE Quota Students
                  </span>
                  <span className="text-[#16834A]">{rteStudents} ({rtePct}%)</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-[#E5EAE5]">
                  <div
                    className="h-full rounded-full bg-[#16834A]"
                    style={{ width: `${rtePct}%` }}
                  />
                </div>
                <div className="mt-1.5 flex justify-between text-[11px] text-[#687568]">
                  <span>Regular: {totalStudents - rteStudents}</span>
                  <span>RTE: {rteStudents}</span>
                </div>
              </div>

              {/* Class distribution */}
              {classDistribution.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#687568] mb-2">
                    Top Classes Distribution
                  </h4>
                  <div className="space-y-1.5">
                    {classDistribution.slice(0, 4).map((c, i) => {
                      const cPct = Math.round((c.students / totalStudents) * 100);
                      return (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <span className="w-16 truncate font-medium text-[#202923]">
                            {c.class_name}
                          </span>
                          <div className="flex-1 h-2 rounded-full bg-[#F7F8F5] overflow-hidden border border-[#E5EAE5]">
                            <div
                              className="h-full rounded-full bg-[#16834A]"
                              style={{ width: `${cPct}%` }}
                            />
                          </div>
                          <span className="w-8 text-right font-bold text-[#687568] tabular-nums">
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

      <div className="mt-4 pt-3 border-t border-[#E5EAE5] text-xs text-[#687568] flex items-center justify-between">
        <span>Accurate gender and quota data directly from verified student profiles</span>
        <span className="font-bold text-[#202923]">{boysPct}% / {girlsPct}% Ratio</span>
      </div>
    </div>
  );
}
