"use client";

import React from "react";
import Link from "next/link";
import {
  Layers3,
  ArrowUpRight,
  Wallet,
  Boxes,
  Bus,
  GraduationCap,
  Users,
  ShieldCheck,
  ClipboardList,
  UserRoundCog,
  BookOpen,
  type LucideIcon,
} from "lucide-react";
import { camelCaseText } from "@/lib/table-utils";
import type { ModuleAdoptionItem } from "./types";

const moduleIcons: Record<string, LucideIcon> = {
  teacher: GraduationCap,
  clerk: ClipboardList,
  librarian: BookOpen,
  library: BookOpen,
  feesmanagement: Wallet,
  feemanagement: Wallet,
  inventory: Boxes,
  transportation: Bus,
  principal: ShieldCheck,
  viceprincipal: UserRoundCog,
  assistantclerk: Users,
};

interface ModuleAdoptionChartProps {
  data: ModuleAdoptionItem[];
  loading?: boolean;
}

export function ModuleAdoptionChart({ data, loading }: ModuleAdoptionChartProps) {
  return (
    <div className="rounded-2xl border border-[#E5EAE5] bg-white p-6 shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-[#16834A]">
                <Layers3 className="h-4 w-4" />
              </span>
              <h3 className="text-base font-bold text-[#202923]">Platform Module Adoption</h3>
            </div>
            <p className="mt-0.5 text-xs text-[#687568]">
              Enterprise feature penetration across registered school tenants
            </p>
          </div>
          <Link
            href="/superadmin/fetures_select"
            className="inline-flex items-center gap-1 text-xs font-bold text-[#16834A] hover:underline"
          >
            Manage Features <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="flex h-56 items-center justify-center text-xs text-[#687568]">
            Loading module adoption…
          </div>
        ) : data.length === 0 ? (
          <div className="flex h-56 items-center justify-center text-xs text-[#687568]">
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
                  className="rounded-xl border border-[#E5EAE5] bg-[#F7F8F5] p-3 transition-colors hover:border-[#16834A]/40"
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-100 text-[#16834A]">
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <span className="font-bold text-[#202923]">
                        {camelCaseText(item.name)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-[#202923]">
                        {item.count} / {item.totalSchools} schools
                      </span>
                      <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-black text-[#16834A]">
                        {item.percentage}%
                      </span>
                    </div>
                  </div>

                  {/* Horizontal Bar */}
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[#E5EAE5]">
                    <div
                      className="h-full rounded-full bg-[#16834A] transition-all duration-500"
                      style={{ width: `${Math.max(item.percentage, 2)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-[#E5EAE5] text-xs text-[#687568] flex items-center justify-between">
        <span>Dynamic module adoption calculated from live active tenant entitlements</span>
        <span className="font-bold text-[#202923]">{data.length} Total Modules</span>
      </div>
    </div>
  );
}
