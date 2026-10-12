"use client";

import React, { useState, useMemo, useId } from "react";
import { TrendingUp, Calendar, Info } from "lucide-react";
import type { EnrollmentMonthData } from "./types";

interface EnrollmentChartProps {
  data: EnrollmentMonthData[];
  loading?: boolean;
}

export function EnrollmentChart({ data, loading = false }: EnrollmentChartProps) {
  const [period, setPeriod] = useState<"6M" | "12M" | "ALL">("12M");
  const [hoveredPoint, setHoveredPoint] = useState<EnrollmentMonthData | null>(null);
  const [hoverCoords, setHoverCoords] = useState<{ x: number; y: number } | null>(null);
  const rawGradId = useId();
  const gradId = useMemo(() => `enrollment-grad-${rawGradId.replace(/:/g, "")}`, [rawGradId]);

  // Filter based on period selector
  const displayData = useMemo(() => {
    if (!data || data.length === 0) return [];
    if (period === "6M") return data.slice(-6);
    if (period === "12M") return data.slice(-12);
    return data;
  }, [data, period]);

  // Calculate SVG dimensions and coordinate scales
  const width = 640;
  const height = 260;
  const padding = { top: 24, right: 28, bottom: 36, left: 44 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const { minVal, maxVal, points, pathD, areaD, yTicks } = useMemo(() => {
    if (displayData.length === 0) {
      return { minVal: 0, maxVal: 100, points: [], pathD: "", areaD: "", yTicks: [0, 50, 100] };
    }

    const totals = displayData.map((d) => d.total);
    const rawMin = Math.min(...totals);
    const rawMax = Math.max(...totals);

    const min = Math.max(0, Math.floor(rawMin * 0.85));
    const max = Math.ceil(rawMax * 1.1) || 10;
    const range = max - min || 1;

    const pts = displayData.map((d, idx) => {
      const x = padding.left + (idx / Math.max(displayData.length - 1, 1)) * chartW;
      const y = padding.top + chartH - ((d.total - min) / range) * chartH;
      return { x, y, data: d };
    });

    // Build smooth SVG path
    let pD = "";
    if (pts.length > 0) {
      pD = `M ${pts[0].x} ${pts[0].y}`;
      for (let i = 1; i < pts.length; i++) {
        const prev = pts[i - 1];
        const curr = pts[i];
        const cpX = (prev.x + curr.x) / 2;
        pD += ` C ${cpX} ${prev.y}, ${cpX} ${curr.y}, ${curr.x} ${curr.y}`;
      }
    }

    // Build area fill path
    let aD = "";
    if (pts.length > 0) {
      const bottomY = padding.top + chartH;
      aD = `${pD} L ${pts[pts.length - 1].x} ${bottomY} L ${pts[0].x} ${bottomY} Z`;
    }

    const step = Math.ceil((max - min) / 4);
    const ticks = [min, min + step, min + step * 2, min + step * 3, max];

    return { minVal: min, maxVal: max, points: pts, pathD: pD, areaD: aD, yTicks: ticks };
  }, [displayData, chartW, chartH, padding.left, padding.top]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between">
      {/* Chart Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 shadow-2xs">
              <TrendingUp className="h-4 w-4" />
            </span>
            <h3 className="text-base font-bold text-slate-900">Student Enrollment Trend</h3>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            Platform-wide cumulative student admissions progression
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-bold text-slate-600">
          {(["6M", "12M", "ALL"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`rounded-lg px-2.5 py-1 transition-all ${
                period === p
                  ? "bg-white text-indigo-600 shadow-xs font-extrabold"
                  : "hover:text-slate-900"
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
          <div className="flex h-full items-center justify-center text-xs text-slate-500">
            Loading enrollment analytics…
          </div>
        ) : displayData.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-xs text-slate-500">
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
                  <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#4F46E5" stopOpacity="0.0" />
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
                      stroke="#F1F5F9"
                      strokeDasharray="4 4"
                      strokeWidth="1"
                    />
                    <text
                      x={padding.left - 8}
                      y={y + 3}
                      textAnchor="end"
                      className="text-[10px] fill-slate-400 font-medium"
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
                  stroke="#4F46E5"
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
                    stroke="#4F46E5"
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
                    className="text-[10px] fill-slate-500 font-bold"
                  >
                    {pt.data.month}
                  </text>
                </g>
              ))}
            </svg>

            {/* Hover Tooltip */}
            {hoveredPoint && hoverCoords && (
              <div
                className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white shadow-xl text-xs"
                style={{
                  left: `${(hoverCoords.x / width) * 100}%`,
                  top: `${(hoverCoords.y / height) * 100 - 6}%`,
                }}
              >
                <div className="font-bold flex items-center gap-1.5 text-indigo-300">
                  <Calendar className="h-3 w-3" />
                  {hoveredPoint.month}
                </div>
                <div className="mt-1 flex items-center justify-between gap-4 text-[11px]">
                  <span className="text-slate-400">Total Enrolled:</span>
                  <span className="font-black text-white">{hoveredPoint.total.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex items-center justify-between gap-4 text-[11px]">
                  <span className="text-slate-400">New Admissions:</span>
                  <span className="font-bold text-emerald-400">+{hoveredPoint.admissions}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-indigo-600" />
          Active Cumulative Enrollments
        </span>
        <span className="font-bold text-slate-900">
          {displayData.length > 0
            ? `${displayData[displayData.length - 1].total.toLocaleString("en-IN")} Total Students`
            : "—"}
        </span>
      </div>
    </div>
  );
}
