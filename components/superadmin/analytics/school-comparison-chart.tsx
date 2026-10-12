"use client";

import React, { useState } from "react";
import { Building2, Users, GraduationCap, BookOpen, ArrowUpRight } from "lucide-react";
import type { SchoolComparisonItem } from "./types";

interface SchoolComparisonChartProps {
  data: SchoolComparisonItem[];
  selectedSchoolId?: number | null;
  onSelectSchool?: (schoolId: number) => void;
  loading?: boolean;
}

export function SchoolComparisonChart({
  data,
  selectedSchoolId,
  onSelectSchool,
  loading,
}: SchoolComparisonChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const maxVal = Math.max(
    ...data.flatMap((d) => [d.students, d.staff, d.classes]),
    10
  );

  return (
    <div className="rounded-2xl border border-[#E5EAE5] bg-white p-6 shadow-xs flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-[#16834A]">
                <Building2 className="h-4 w-4" />
              </span>
              <h3 className="text-base font-bold text-[#202923]">School-wise Comparison</h3>
            </div>
            <p className="mt-0.5 text-xs text-[#687568]">
              Cross-institutional comparison of students, faculty, and classes
            </p>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 text-xs font-bold">
            <span className="flex items-center gap-1.5 text-[#202923]">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#16834A]" />
              Students
            </span>
            <span className="flex items-center gap-1.5 text-[#202923]">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#202923]" />
              Staff
            </span>
            <span className="flex items-center gap-1.5 text-[#202923]">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#34D399]" />
              Classes
            </span>
          </div>
        </div>

        {/* Bar chart content */}
        {loading ? (
          <div className="flex h-56 items-center justify-center text-xs text-[#687568]">
            Loading school comparison…
          </div>
        ) : data.length === 0 ? (
          <div className="flex h-56 items-center justify-center text-xs text-[#687568]">
            No school comparison data available.
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {data.map((item, idx) => {
              const isSelected = selectedSchoolId === item.id;
              const isHovered = hoveredIdx === idx;

              return (
                <div
                  key={item.id}
                  onClick={() => onSelectSchool?.(item.id)}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  className={`group rounded-xl p-3 border transition-all cursor-pointer ${
                    isSelected
                      ? "border-[#16834A] bg-emerald-50/40 shadow-xs"
                      : isHovered
                      ? "border-[#E5EAE5] bg-[#F7F8F5]"
                      : "border-transparent bg-transparent"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#202923] group-hover:text-[#16834A] transition-colors">
                        {item.name}
                      </span>
                      {isSelected && (
                        <span className="rounded bg-[#16834A] px-1.5 py-0.5 text-[9px] font-black uppercase text-white">
                          Selected
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-bold text-[#687568] flex items-center gap-1 group-hover:text-[#16834A]">
                      Inspect <ArrowUpRight className="h-3 w-3" />
                    </span>
                  </div>

                  {/* Grouped Bars */}
                  <div className="space-y-1.5">
                    {/* Students Bar */}
                    <div className="flex items-center gap-2">
                      <span className="w-16 shrink-0 text-[10px] font-bold text-[#687568]">
                        Students
                      </span>
                      <div className="flex-1 h-3 rounded-full bg-[#F7F8F5] overflow-hidden border border-[#E5EAE5]/60">
                        <div
                          className="h-full rounded-full bg-[#16834A] transition-all duration-300"
                          style={{ width: `${Math.max((item.students / maxVal) * 100, 2)}%` }}
                        />
                      </div>
                      <span className="w-10 text-right text-[11px] font-extrabold text-[#202923] tabular-nums">
                        {item.students}
                      </span>
                    </div>

                    {/* Staff Bar */}
                    <div className="flex items-center gap-2">
                      <span className="w-16 shrink-0 text-[10px] font-bold text-[#687568]">
                        Staff
                      </span>
                      <div className="flex-1 h-3 rounded-full bg-[#F7F8F5] overflow-hidden border border-[#E5EAE5]/60">
                        <div
                          className="h-full rounded-full bg-[#202923] transition-all duration-300"
                          style={{ width: `${Math.max((item.staff / maxVal) * 100, 2)}%` }}
                        />
                      </div>
                      <span className="w-10 text-right text-[11px] font-extrabold text-[#202923] tabular-nums">
                        {item.staff}
                      </span>
                    </div>

                    {/* Classes Bar */}
                    <div className="flex items-center gap-2">
                      <span className="w-16 shrink-0 text-[10px] font-bold text-[#687568]">
                        Classes
                      </span>
                      <div className="flex-1 h-3 rounded-full bg-[#F7F8F5] overflow-hidden border border-[#E5EAE5]/60">
                        <div
                          className="h-full rounded-full bg-[#34D399] transition-all duration-300"
                          style={{ width: `${Math.max((item.classes / maxVal) * 100, 2)}%` }}
                        />
                      </div>
                      <span className="w-10 text-right text-[11px] font-extrabold text-[#202923] tabular-nums">
                        {item.classes}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-[#E5EAE5] text-xs text-[#687568] flex items-center justify-between">
        <span>Click any school row to filter and inspect detailed telemetry</span>
        <span className="font-bold text-[#16834A]">{data.length} registered schools</span>
      </div>
    </div>
  );
}
