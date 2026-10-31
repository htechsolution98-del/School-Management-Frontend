"use client";

import { FileText, Printer } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResultTemplatePicker } from "@/components/results/result-template-picker";

export default function ClerkResultTemplatesPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">Result Documents</p>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-black text-slate-900"><FileText className="h-6 w-6" /> Marksheet Templates</h1>
        <p className="mt-2 text-sm text-slate-500">Choose the school-wide layout used for published student marksheets and class printouts. The Principal can confirm or change the template during publication.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>School result template</CardTitle><CardDescription>This preference is shared by the clerk and principal workspaces on this device.</CardDescription></CardHeader>
        <CardContent className="space-y-5">
          <ResultTemplatePicker />
          <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-600"><Printer className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" /><p>School name and logo from the school profile, plus the selected exam, class, student, marks, grade, and result status are included when marksheets are printed.</p></div>
        </CardContent>
      </Card>
    </div>
  );
}
