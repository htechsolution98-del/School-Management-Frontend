import React from "react";
import { cn } from "@/lib/utils";

export interface TableEmptyStateProps {
  title?: string;
  description?: string;
  imageClassName?: string;
  className?: string;
  children?: React.ReactNode;
}

export function TableEmptyState({
  title = "No records found",
  description,
  imageClassName,
  className,
  children,
}: TableEmptyStateProps) {
  return (
    <div className={cn("py-10 sm:py-14 text-center flex flex-col items-center justify-center select-none", className)}>
      <img
        src="/images/empty-folder.png"
        alt={title}
        className={cn(
          "w-20 sm:w-24 h-auto object-contain mx-auto mb-3 filter drop-shadow-sm select-none pointer-events-none",
          imageClassName
        )}
      />
      <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200">
        {title}
      </h3>
      {description && (
        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
          {description}
        </p>
      )}
      {children}
    </div>
  );
}

export { TableEmptyState as StudentEmptyState };
export default TableEmptyState;
