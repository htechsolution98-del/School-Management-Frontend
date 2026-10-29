"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface StudentEmptyStateProps {
  title?: string;
  description?: string;
  actionText?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  imageClassName?: string;
  children?: React.ReactNode;
}

/**
 * Reusable empty state component for the entire Student Panel.
 * Uses the verified /images/empty-folder.png illustration from the project's public folder.
 */
export function StudentEmptyState({
  title = "No records found",
  description,
  actionText,
  actionLabel,
  onAction,
  className,
  imageClassName,
  children,
}: StudentEmptyStateProps) {
  const buttonLabel = actionLabel || actionText;

  return (
    <div
      className={cn(
        "py-10 sm:py-14 px-4 text-center flex flex-col items-center justify-center select-none",
        className
      )}
    >
      <div className="relative mb-3">
        <img
          src="/images/empty-folder.png"
          alt={title}
          className={cn(
            "w-20 sm:w-24 h-auto object-contain mx-auto filter drop-shadow-sm pointer-events-none transition-transform duration-300 hover:scale-105",
            imageClassName
          )}
        />
      </div>

      <h3 className="text-sm sm:text-base font-bold text-slate-800 tracking-tight">
        {title}
      </h3>

      {description && (
        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
          {description}
        </p>
      )}

      {buttonLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs hover:shadow-md transition-all active:scale-95 cursor-pointer"
        >
          {buttonLabel}
        </button>
      )}

      {children}
    </div>
  );
}

export default StudentEmptyState;
