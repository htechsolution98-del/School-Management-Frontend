"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

export function AdminButton({ className, variant = "default", ...props }: ComponentProps<typeof Button>) {
  const isOutline = variant === "outline" || variant === "ghost";

  return (
    <Button
      variant={variant}
      {...props}
      className={cn(
        "h-10 rounded-xl px-4 text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-50",
        isOutline
          ? "border border-slate-300 bg-white text-slate-700 shadow-xs hover:bg-slate-100 hover:text-slate-900 hover:border-slate-400 focus-visible:ring-slate-300"
          : "border border-[#5826df] bg-[#5826df] text-white shadow-md shadow-indigo-500/20 hover:bg-[#4a1ec2] hover:border-[#4a1ec2] focus-visible:ring-[#5826df]/40",
        props.size?.startsWith("icon") && "w-10 px-0",
        className
      )}
    />
  );
}
