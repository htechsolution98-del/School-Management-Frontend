"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

export function AdminButton({ className, ...props }: ComponentProps<typeof Button>) {
  return <Button {...props} className={cn("h-10 rounded-lg border border-[#1D496C] bg-[#1D496C] px-4 text-sm font-semibold text-white shadow-none hover:bg-[#163b58] focus-visible:ring-slate-300 disabled:opacity-50", props.size?.startsWith("icon") && "w-10 px-0", className)} />;
}
