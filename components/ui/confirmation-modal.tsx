"use client";

import React, { useEffect } from "react";
import { AlertTriangle, Trash2, HelpCircle, Info, Loader2, X } from "lucide-react";

export interface ConfirmationModalProps {
  isOpen: boolean;
  title?: string;
  message?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info" | "primary";
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export function ConfirmationModal({
  isOpen,
  title = "Are you sure?",
  message = "This action cannot be undone.",
  confirmText = "Delete",
  cancelText = "Cancel",
  variant = "danger",
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isLoading) {
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLoading, onCancel]);

  if (!isOpen) return null;

  const renderIcon = () => {
    switch (variant) {
      case "danger":
        return (
          <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
            <Trash2 className="w-6 h-6" />
          </div>
        );
      case "warning":
        return (
          <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
        );
      case "info":
        return (
          <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Info className="w-6 h-6" />
          </div>
        );
      case "primary":
      default:
        return (
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-[#5826df] dark:text-indigo-400 flex items-center justify-center shrink-0">
            <HelpCircle className="w-6 h-6" />
          </div>
        );
    }
  };

  const getConfirmButtonClasses = () => {
    switch (variant) {
      case "danger":
        return "bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-500/20";
      case "warning":
        return "bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-500/20";
      case "info":
        return "bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20";
      case "primary":
      default:
        return "bg-[#5826df] hover:bg-[#4a1ec2] text-white shadow-md shadow-indigo-500/20";
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) {
          onCancel();
        }
      }}
    >
      <div className="relative w-[95%] sm:w-full max-w-md mx-auto bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-4 sm:p-6 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Top-right close button */}
        <button
          type="button"
          disabled={isLoading}
          onClick={onCancel}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-40"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Body */}
        <div className="flex items-start gap-4">
          {renderIcon()}
          <div className="flex-1 pr-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {title}
            </h3>
            <div className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
              {message}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            disabled={isLoading}
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={() => onConfirm()}
            className={`inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold active:scale-95 transition-all disabled:opacity-50 ${getConfirmButtonClasses()}`}
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
