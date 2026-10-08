"use client";

import { useEffect, useState } from "react";
import { Loader2, BookOpen, Users, Layers, ShieldCheck, Mail, Phone, MapPin } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getSchoolDetails, type SchoolDetailedStats } from "@/lib/superadmin";
import type { School } from "@/types/superadmin";
import { SchoolLogo } from "./school-logo";
import { camelCaseText } from "@/lib/table-utils";
import { SchoolClassesFilter } from "./school-classes-filter";
import { StatusBadge } from "./status-badge";

export function SchoolDetails({ school, onClose }: { school: School | null; onClose: () => void }) {
  const [result, setResult] = useState<{ id: number; data?: SchoolDetailedStats; error?: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"classes" | "summary" | "staff" | "features">("classes");

  useEffect(() => {
    if (!school?.id) return;
    let active = true;
    const id = school.id;
    getSchoolDetails(id)
      .then((data) => {
        if (active) setResult({ id, data });
      })
      .catch((error) => {
        if (active) setResult({ id, error: error instanceof Error ? error.message : "Unable to load school details." });
      });
    return () => {
      active = false;
    };
  }, [school?.id]);

  const current = result?.id === school?.id ? result : null;
  const data = current?.data;
  const schoolLogoSrc = school?.logo || data?.school?.logo;
  const schoolDisplayName = camelCaseText(school?.name || data?.school?.name) || "School Details";

  return (
    <Dialog
      open={!!school}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="admin-scroll-area max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3 pr-6">
            <div className="flex items-center gap-3.5">
              <SchoolLogo
                src={schoolLogoSrc}
                name={schoolDisplayName}
                className="h-12 w-12 rounded-xl shadow-xs"
              />
              <div>
                <DialogTitle className="text-xl font-black text-slate-900">{schoolDisplayName}</DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  {(school?.code || data?.school?.code) ? `Code: ${school?.code || data?.school?.code} · ` : ""}
                  {[school?.city || data?.school?.city, school?.state || data?.school?.state, school?.country || data?.school?.country].filter(Boolean).map(camelCaseText).join(", ")}
                </DialogDescription>
              </div>
            </div>
            {school && <StatusBadge active={school.is_active ?? true} />}
          </div>
        </DialogHeader>

        {!current && (
          <p className="flex items-center justify-center gap-2 py-16 text-xs font-bold text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
            Loading school details & student directory…
          </p>
        )}

        {current?.error && (
          <div className="p-4 rounded-xl bg-red-50 text-xs font-bold text-red-700">
            {current.error}
          </div>
        )}

        {data && (
          <div className="space-y-5">
            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3">
                <p className="text-[10px] font-bold uppercase text-blue-600">Total Students</p>
                <p className="mt-0.5 text-lg font-black text-slate-900">{data.metrics.total_students}</p>
                <p className="text-[10px] text-slate-500">{data.metrics.total_boys} Boys · {data.metrics.total_girls} Girls</p>
              </div>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3">
                <p className="text-[10px] font-bold uppercase text-emerald-600">Total Staff</p>
                <p className="mt-0.5 text-lg font-black text-slate-900">{data.metrics.total_staff}</p>
                <p className="text-[10px] text-slate-500">{data.metrics.teachers_count} Teachers</p>
              </div>
              <div className="rounded-xl border border-purple-100 bg-purple-50/40 p-3">
                <p className="text-[10px] font-bold uppercase text-purple-600">Classes</p>
                <p className="mt-0.5 text-lg font-black text-slate-900">{data.classes?.length || 0}</p>
                <p className="text-[10px] text-slate-500">Divisions active</p>
              </div>
              <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-3">
                <p className="text-[10px] font-bold uppercase text-amber-600">RTE Students</p>
                <p className="mt-0.5 text-lg font-black text-slate-900">{data.metrics.rte_students || 0}</p>
                <p className="text-[10px] text-slate-500">Special quota</p>
              </div>
            </div>

            {/* Sub-navigation Tabs */}
            <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab("classes")}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === "classes" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Classes & Student Filtration ({data.classes?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("staff")}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === "staff" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Staff Directory ({data.staff?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("features")}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === "features" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Modules ({data.features?.length || 0})
              </button>
            </div>

            {/* TAB 1: CLASSES & STUDENT FILTER */}
            {activeTab === "classes" && (
              <SchoolClassesFilter
                classes={data.classes || []}
                students={data.students || []}
                schoolName={data.school.name || school?.name || undefined}
                schoolLogo={schoolLogoSrc}
              />
            )}

            {/* TAB 2: STAFF */}
            {activeTab === "staff" && (
              <div className="rounded-2xl border border-slate-100 overflow-hidden bg-white">
                <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">Staff Members</h4>
                </div>
                {!data.staff?.length ? (
                  <p className="p-6 text-center text-xs text-slate-400">No staff members listed.</p>
                ) : (
                  <div className="divide-y divide-slate-100 text-xs">
                    {data.staff.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-3">
                        <div>
                          <p className="font-bold text-slate-900">{member.name}</p>
                          <p className="text-[10px] text-slate-400">{member.email} · {member.mobile}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                            {member.category}
                          </span>
                          <StatusBadge active={member.is_active} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: FEATURES */}
            {activeTab === "features" && (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-xs">
                {data.features.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-xl border border-slate-200/80 p-3 bg-slate-50/50">
                    <span className="font-bold text-slate-800">{item.name}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.is_enabled ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"}`}>
                      {item.is_enabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
