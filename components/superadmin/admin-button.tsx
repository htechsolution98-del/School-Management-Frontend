"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

export function AdminButton({ className, ...props }: ComponentProps<typeof Button>) {
  return <Button {...props} className={cn("h-10 rounded-xl border border-[#5826df] bg-[#5826df] px-4 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 hover:bg-[#4a1ec2] hover:border-[#4a1ec2] focus-visible:ring-[#5826df]/40 active:scale-[0.98] transition-all disabled:opacity-50", props.size?.startsWith("icon") && "w-10 px-0", className)} />;
}
