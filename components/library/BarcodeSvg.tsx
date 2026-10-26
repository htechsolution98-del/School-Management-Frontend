"use client";

import React, { useMemo } from "react";

// Standard Code 128B barcode patterns (bars and spaces widths)
// Each pattern represents 6 widths: bar, space, bar, space, bar, space
const CODE128_PATTERNS: string[] = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213", // 0-9
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132", // 10-19
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211", // 20-29
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313", // 30-39
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331", // 40-49
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111", // 50-59
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214", // 60-69
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111", // 70-79
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141", // 80-89
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141", // 90-99
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112" // 100-106 (104=Start B, 106=Stop)
];

const START_B_INDEX = 104;
const STOP_INDEX = 106;

export interface BarcodeSvgProps {
  value: string;
  width?: number | string;
  height?: number;
  showText?: boolean;
  className?: string;
}

export function BarcodeSvg({
  value,
  width = "100%",
  height = 54,
  showText = true,
  className = "",
}: BarcodeSvgProps) {
  const cleanValue = (value || "").trim().slice(0, 30);

  const barcodeBars = useMemo(() => {
    if (!cleanValue) return [];

    const codes: number[] = [START_B_INDEX];
    let checksum = START_B_INDEX;

    for (let i = 0; i < cleanValue.length; i++) {
      const charCode = cleanValue.charCodeAt(i);
      // Code 128B character index = charCode - 32
      const codeIndex = charCode >= 32 && charCode <= 126 ? charCode - 32 : 0;
      codes.push(codeIndex);
      checksum += codeIndex * (i + 1);
    }

    const checkDigit = checksum % 103;
    codes.push(checkDigit);
    codes.push(STOP_INDEX);

    // Build bar widths: alternating black bar and white space
    const bars: { isBar: boolean; width: number }[] = [];
    codes.forEach((codeIdx) => {
      const pattern = CODE128_PATTERNS[codeIdx] || "212222";
      for (let p = 0; p < pattern.length; p++) {
        const w = parseInt(pattern[p], 10);
        bars.push({ isBar: p % 2 === 0, width: w });
      }
    });

    return bars;
  }, [cleanValue]);

  const totalWidth = useMemo(() => {
    return barcodeBars.reduce((sum, b) => sum + b.width, 0) + 20; // 10px quiet zone each side
  }, [barcodeBars]);

  if (!cleanValue) {
    return <div className="text-xs text-slate-400 italic">No Barcode</div>;
  }

  let currentX = 10;

  return (
    <div className={`inline-flex flex-col items-center select-none ${className}`}>
      <svg
        viewBox={`0 0 ${totalWidth} ${height}`}
        style={{ width, height, maxWidth: "100%" }}
        className="overflow-visible"
        preserveAspectRatio="none"
      >
        <rect x="0" y="0" width={totalWidth} height={height} fill="#ffffff" />
        {barcodeBars.map((bar, idx) => {
          const x = currentX;
          currentX += bar.width;
          if (!bar.isBar) return null;
          return (
            <rect
              key={idx}
              x={x}
              y={2}
              width={bar.width}
              height={height - 4}
              fill="#0f172a"
            />
          );
        })}
      </svg>
      {showText && (
        <span className="font-mono text-[11px] font-bold tracking-wider text-slate-800 mt-1">
          {cleanValue}
        </span>
      )}
    </div>
  );
}
