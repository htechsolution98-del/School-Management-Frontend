"use client";

import { useState } from "react";
import { Building2 } from "lucide-react";
import { backendMediaUrl } from "@/lib/media";

export function SchoolLogo({ src, name, className = "h-10 w-10" }: { src?: string | null; name?: string | null; className?: string }) {
  const url = backendMediaUrl(src);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  return <span className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white ${className}`}>
    {url && failedUrl !== url ? <img src={url} alt={`${name || "School"} logo`} className="h-full w-full object-contain p-1" onError={() => setFailedUrl(url)} /> : <Building2 className="h-5 w-5 text-slate-400" />}
  </span>;
}
