"use client";

import React, { useEffect, useState } from "react";
import { AlertTriangle, Trash2, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  itemName?: string;
  itemType?: "rack" | "shelf" | "book" | "copy" | "reservation" | "custom";
  description?: string;
  consequences?: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

export function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  itemName,
  itemType = "rack",
  description,
  consequences,
  confirmText = "Delete",
  cancelText = "Cancel",
  isDestructive = true,
}: ConfirmDeleteModalProps) {
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setServerError(null);
      setLoading(false);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen && !loading) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  const handleAction = async () => {
    if (loading) return;
    setLoading(true);
    setServerError(null);
    try {
      await onConfirm();
      onClose();
    } catch (err: any) {
      const msg = err.message || "An unexpected error occurred while processing this deletion.";
      setServerError(msg);
    } finally {
      setLoading(false);
    }
  };

  const defaultDescription = description || (
    itemName
      ? `Are you sure you want to delete ${itemType} "${itemName}"?`
      : `Are you sure you want to delete this ${itemType}?`
  );

  const defaultConsequences = consequences || (
    itemType === "rack"
      ? "Associated child shelves, location metadata, and catalog placements will be deactivated. This action is blocked if active books or physical copies are currently assigned to this rack."
      : itemType === "shelf"
      ? "Shelf location records will be deactivated. Active physical book copies placed on this shelf must be reassigned first."
      : itemType === "book"
      ? "All associated physical copies and barcode circulation records will be permanently removed from your library catalogue."
      : itemType === "copy"
      ? "This physical copy will be decommissioned and excluded from circulation stock."
      : "This action cannot be undone."
  );

  return (
    <div className="fixed inset-0 z-[80] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div
        className="bg-white rounded-3xl p-6 max-w-md w-full space-y-5 border border-slate-200/90 shadow-2xl animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-delete-title"
      >
        {/* Header Icon + Title */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 ${
                isDestructive
                  ? "bg-rose-50 text-rose-600 border border-rose-100"
                  : "bg-blue-50 text-blue-600 border border-blue-100"
              }`}
            >
              {isDestructive ? (
                <Trash2 className="h-5 w-5" />
              ) : (
                <AlertTriangle className="h-5 w-5" />
              )}
            </div>
            <div>
              <h3 id="confirm-delete-title" className="text-lg font-bold text-slate-900">
                {title}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Please review the details below</p>
            </div>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-40"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Server Error Message if deletion prohibited */}
        {serverError && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 animate-in fade-in">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold">Deletion Prohibited</span>
              <p className="leading-relaxed font-normal">{serverError}</p>
            </div>
          </div>
        )}

        {/* Body Description & Highlight */}
        <div className="space-y-3 text-xs text-slate-600">
          <p className="text-sm font-medium text-slate-800 leading-snug">
            {defaultDescription}
          </p>

          {itemName && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 font-mono text-xs font-bold text-slate-800 flex items-center justify-between">
              <span className="text-slate-500 font-sans font-medium capitalize">{itemType} Identifier:</span>
              <span className="text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                {itemName}
              </span>
            </div>
          )}

          <div className="p-3 bg-amber-50/70 border border-amber-200/70 rounded-xl text-amber-900 flex items-start gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              <span className="font-bold">Note: </span>
              {defaultConsequences}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={onClose}
            className="h-10 px-4 rounded-xl border-slate-200 text-slate-700 font-semibold hover:bg-slate-50"
          >
            {cancelText}
          </Button>

          <Button
            type="button"
            disabled={loading}
            onClick={handleAction}
            className={`h-10 px-5 rounded-xl font-bold text-white shadow-xs gap-1.5 transition-all ${
              isDestructive
                ? "bg-rose-600 hover:bg-rose-700 active:bg-rose-800 focus:ring-2 focus:ring-rose-500/20"
                : "bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-blue-800 focus:ring-2 focus:ring-blue-500/20"
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                {isDestructive && <Trash2 className="h-4 w-4" />}
                <span>{confirmText}</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
