"use client";

import React from "react";
import Link from "next/link";
import {
  Layers3,
  BookOpen,
  Calendar,
  CreditCard,
  GraduationCap,
  Users,
  ShieldCheck,
  FileText,
  Bus,
  ArrowUpRight,
} from "lucide-react";
import { camelCaseText } from "@/lib/table-utils";
import type { ModuleAdoptionData } from "./types";

interface ModuleAdoptionChartProps {
  data: ModuleAdoptionData[];
  loading?: boolean;
}

const moduleIcons: Record<string, React.ElementType> = {
  admission: GraduationCap,
  attendance: Calendar,
  fees: CreditCard,
  library: BookOpen,
  transport: Bus,
  staff: Users,
  exam: FileText,
  security: ShieldCheck,
};

export function ModuleAdoptionChart({ data, loading }: ModuleAdoptionChartProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-600 shadow-2xs">
                <Layers3 className="h-4 w-4" />
              </span>
              <h3 className="text-base font-bold text-slate-900">Platform Module Adoption</h3>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              Enterprise feature penetration across registered school tenants
            </p>
          </div>
          <Link
            href="/superadmin/fetures_select"
            className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline"
          >
            Manage Features <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="flex h-56 items-center justify-center text-xs text-slate-500">
            Loading module adoption…
          </div>
        ) : data.length === 0 ? (
          <div className="flex h-56 items-center justify-center text-xs text-slate-500">
            No platform modules configured yet.
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {data.map((item) => {
              const cleanCode = item.codeName.toLowerCase().replace(/[^a-z]/g, "");
              const Icon = moduleIcons[cleanCode] || Layers3;

              return (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 transition-colors hover:border-indigo-300 shadow-2xs"
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-100 text-indigo-600">
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <span className="font-bold text-slate-900">
                        {camelCaseText(item.name)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900">
                        {item.count} / {item.totalSchools} schools
                      </span>
                      <span className="rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-black text-indigo-700 border border-indigo-200/60">
                        {item.percentage}%
                      </span>
                    </div>
                  </div>

                  {/* Horizontal Bar */}
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-indigo-600 transition-all duration-500"
                      style={{ width: `${Math.max(item.percentage, 2)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
        <span>Dynamic module adoption calculated from live active tenant entitlements</span>
        <span className="font-bold text-slate-900">{data.length} Total Modules</span>
      </div>
    </div>
  );
}
