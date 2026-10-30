"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { RESULT_TEMPLATES, getSavedResultTemplate, saveResultTemplate, type ResultTemplateId } from "@/lib/result-template";

export function ResultTemplatePicker({ compact = false, onChange }: { compact?: boolean; onChange?: (id: ResultTemplateId) => void }) {
  const [selected, setSelected] = useState<ResultTemplateId>("classic");
  useEffect(() => setSelected(getSavedResultTemplate()), []);
  const choose = (id: ResultTemplateId) => { setSelected(id); saveResultTemplate(id); onChange?.(id); };

  return (
    <div className={compact ? "space-y-2" : "grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"}>
      {RESULT_TEMPLATES.map((template) => {
        const active = selected === template.id;
        return (
          <button key={template.id} type="button" onClick={() => choose(template.id)} aria-pressed={active}
            className={`rounded-xl border p-3 text-left transition ${active ? "border-indigo-500 bg-indigo-50 ring-1 ring-indigo-300" : "border-slate-200 bg-white hover:border-indigo-300"}`}>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-900">{template.name}</span>
              {active && <Check className="h-4 w-4 text-indigo-600" />}
            </div>
            <div className="relative mb-2 h-12 overflow-hidden rounded-md border border-slate-200 bg-white p-1.5">
              {template.id === "watermark" && <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-xl font-black opacity-10" style={{ color: template.accent }}>LOGO</span>}
              <div className={`h-2 rounded-sm ${template.header === "band" ? "mb-1 h-4" : ""}`} style={{ backgroundColor: template.accent, opacity: template.header === "band" ? 1 : 0.18 }} />
              <div className="mt-1 h-1 w-3/4 rounded bg-slate-300" />
              <div className="mt-1 h-1 w-full rounded bg-slate-200" />
            </div>
            <p className="text-xs text-slate-500">{template.description}</p>
          </button>
        );
      })}
    </div>
  );
}
