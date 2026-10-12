"use client";

import React, { useState, useId } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { TrendingUp, Calendar, Info } from "lucide-react";
import type { EnrollmentPoint } from "./types";

interface EnrollmentChartProps {
  data: EnrollmentPoint[];
  loading?: boolean;
}

export function EnrollmentChart({ data, loading }: EnrollmentChartProps) {
  const [period, setPeriod] = useState<"6M" | "12M" | "ALL">("ALL");
  const [hoveredPoint, setHoveredPoint] = useState<EnrollmentPoint | null>(null);
  const [hoverCoords, setHoverCoords] = useState<{ x: number; y: number } | null>(null);
  const reduceMotion = useReducedMotion();
  const gradId = useId();

  // Filter data according to period
  const displayData = React.useMemo(() => {
    if (!data || data.length === 0) return [];
    if (period === "6M") return data.slice(-6);
    if (period === "12M") return data.slice(-12);
    return data;
  }, [data, period]);

  // Chart geometry
  const width = 640;
  const height = 240;
  const padding = { top: 20, right: 24, bottom: 36, left: 44 };

  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxVal = Math.max(...displayData.map((d) => d.total), 10);
  const minVal = 0;

  const points = displayData.map((d, i) => {
    const x =
      displayData.length > 1
        ? padding.left + (i / (displayData.length - 1)) * chartW
        : padding.left + chartW / 2;
    const y = padding.top + chartH - ((d.total - minVal) / (maxVal - minVal || 1)) * chartH;
    return { x, y, data: d };
  });

  // Generate smooth SVG path
  const pathD = React.useMemo(() => {
    if (points.length === 0) return "";
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
    return points.reduce((acc, curr, idx, arr) => {
      if (idx === 0) return `M ${curr.x} ${curr.y}`;
      const prev = arr[idx - 1];
      const cx = (prev.x + curr.x) / 2;
      return `${acc} C ${cx} ${prev.y}, ${cx} ${curr.y}, ${curr.x} ${curr.y}`;
    }, "");
  }, [points]);

  const areaD = React.useMemo(() => {
    if (!pathD || points.length === 0) return "";
    const first = points[0];
    const last = points[points.length - 1];
    const baseline = padding.top + chartH;
    return `${pathD} L ${last.x} ${baseline} L ${first.x} ${baseline} Z`;
  }, [pathD, points, padding.top, chartH]);

  const yTicks = [0, Math.round(maxVal / 2), maxVal];

  return (
    <div className="rounded-2xl border border-[#E5EAE5] bg-white p-6 shadow-xs flex flex-col justify-between">
      {/* Chart Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-[#16834A]">
              <TrendingUp className="h-4 w-4" />
            </span>
            <h3 className="text-base font-bold text-[#202923]">Student Enrollment Trend</h3>
          </div>
          <p className="mt-0.5 text-xs text-[#687568]">
            Platform-wide cumulative student admissions progression
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex items-center rounded-xl bg-[#F7F8F5] p-1 border border-[#E5EAE5] text-xs font-bold text-[#687568]">
          {(["6M", "12M", "ALL"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`rounded-lg px-2.5 py-1 transition-all ${
                period === p
                  ? "bg-white text-[#16834A] shadow-xs font-extrabold"
                  : "hover:text-[#202923]"
              }`}
            >
              {p === "ALL" ? "All Time" : p}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="relative w-full aspect-[16/7] min-h-[220px]">
        {loading ? (
          <div className="flex h-full items-center justify-center text-xs text-[#687568]">
            Loading enrollment analytics…
          </div>
        ) : displayData.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-xs text-[#687568]">
            <Info className="h-5 w-5 text-slate-300" />
            <p>No enrollment history records available yet.</p>
          </div>
        ) : (
          <div className="relative w-full h-full">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="w-full h-full overflow-visible"
              role="img"
              aria-label="Student Enrollment Trend line chart"
            >
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#16834A" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#16834A" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Y Grid Lines & Labels */}
              {yTicks.map((tickVal) => {
                const y = padding.top + chartH - ((tickVal - minVal) / (maxVal - minVal || 1)) * chartH;
                return (
                  <g key={tickVal}>
                    <line
                      x1={padding.left}
                      y1={y}
                      x2={width - padding.right}
                      y2={y}
                      stroke="#E5EAE5"
                      strokeDasharray="4 4"
                      strokeWidth="1"
                    />
                    <text
                      x={padding.left - 8}
                      y={y + 4}
                      textAnchor="end"
                      className="text-[10px] fill-[#687568] font-bold"
                    >
                      {tickVal}
                    </text>
                  </g>
                );
              })}

              {/* Area & Line */}
              {areaD && <path d={areaD} fill={`url(#${gradId})`} />}
              {pathD && (
                <path
                  d={pathD}
                  fill="none"
                  stroke="#16834A"
                  strokeWidth="2.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Data Points */}
              {points.map((pt, idx) => (
                <g key={idx}>
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={hoveredPoint === pt.data ? "6" : "4"}
                    fill="#FFFFFF"
                    stroke="#16834A"
                    strokeWidth={hoveredPoint === pt.data ? "3" : "2"}
                    className="cursor-pointer transition-all duration-150"
                    onMouseEnter={() => {
                      setHoveredPoint(pt.data);
                      setHoverCoords({ x: pt.x, y: pt.y });
                    }}
                    onMouseLeave={() => {
                      setHoveredPoint(null);
                      setHoverCoords(null);
                    }}
                  />
                  {/* X Axis Labels */}
                  <text
                    x={pt.x}
                    y={height - 10}
                    textAnchor="middle"
                    className="text-[10px] fill-[#687568] font-bold"
                  >
                    {pt.data.month}
                  </text>
                </g>
              ))}
            </svg>

            {/* Hover Tooltip */}
            {hoveredPoint && hoverCoords && (
              <div
                className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded-xl border border-[#E5EAE5] bg-[#202923] px-3 py-2 text-white shadow-lg text-xs"
                style={{
                  left: `${(hoverCoords.x / width) * 100}%`,
                  top: `${(hoverCoords.y / height) * 100 - 6}%`,
                }}
              >
                <div className="font-bold flex items-center gap-1.5 text-emerald-300">
                  <Calendar className="h-3 w-3" />
                  {hoveredPoint.month}
                </div>
                <div className="mt-1 flex items-center justify-between gap-4 text-[11px]">
                  <span className="text-slate-300">Total Enrolled:</span>
                  <span className="font-black text-white">{hoveredPoint.total.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex items-center justify-between gap-4 text-[11px]">
                  <span className="text-slate-300">New Admissions:</span>
                  <span className="font-bold text-emerald-400">+{hoveredPoint.admissions}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-[#E5EAE5] flex items-center justify-between text-xs text-[#687568]">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#16834A]" />
          Active Cumulative Enrollments
        </span>
        <span className="font-bold text-[#202923]">
          {displayData.length > 0
            ? `${displayData[displayData.length - 1].total.toLocaleString("en-IN")} Total Students`
            : "—"}
        </span>
      </div>
    </div>
  );
}
