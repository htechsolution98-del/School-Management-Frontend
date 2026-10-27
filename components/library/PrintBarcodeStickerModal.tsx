"use client";

import React from "react";
import { Printer, X, BookOpen, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BarcodeSvg } from "./BarcodeSvg";
import { BookCopy, Book } from "@/lib/library";

export interface PrintBarcodeStickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  copy?: BookCopy | null;
  book?: Book | null;
  allCopies?: BookCopy[];
}

export function PrintBarcodeStickerModal({
  isOpen,
  onClose,
  copy,
  book,
  allCopies = [],
}: PrintBarcodeStickerModalProps) {
  if (!isOpen) return null;

  const copiesToPrint: BookCopy[] = copy ? [copy] : allCopies;
  const bookTitle = book?.title || copy?.book_title || "Library Book";

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[85] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div
        className="bg-white rounded-3xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-5 border border-slate-200 shadow-2xl"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
              <Printer className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {copy ? "Print Physical Copy Barcode Sticker" : "Print Barcode Labels Sheet"}
              </h3>
              <p className="text-xs text-slate-500">
                {bookTitle} ({copiesToPrint.length} sticker{copiesToPrint.length > 1 ? "s" : ""})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Printable Barcode Stickers Container */}
        <div className="printable-barcode-sheet space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {copiesToPrint.map((cp) => (
              <div
                key={cp.id}
                className="p-4 bg-white border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-between text-center space-y-2.5 relative break-inside-avoid shadow-xs print:border-solid print:border-slate-800 print:shadow-none print:m-1"
                style={{ minHeight: "150px" }}
              >
                {/* Header Tag */}
                <div className="w-full flex items-center justify-between text-[10px] text-slate-500 font-bold border-b border-slate-100 pb-1.5">
                  <span className="flex items-center gap-1 uppercase tracking-wider text-indigo-700">
                    <BookOpen className="h-3 w-3" /> VidyaSanchalan
                  </span>
                  <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                    {cp.accession_no}
                  </span>
                </div>

                {/* Title */}
                <div className="w-full">
                  <p className="font-bold text-xs text-slate-900 line-clamp-1">
                    {bookTitle}
                  </p>
                </div>

                {/* Barcode Graphic */}
                <div className="py-1 w-full flex justify-center">
                  <BarcodeSvg
                    value={cp.barcode || cp.accession_no}
                    width={180}
                    height={46}
                    showText={true}
                  />
                </div>

                {/* Location Footer */}
                <div className="w-full flex items-center justify-between text-[9px] text-slate-500 border-t border-slate-100 pt-1.5">
                  <span className="flex items-center gap-0.5 font-medium">
                    <MapPin className="h-2.5 w-2.5 text-slate-400" />
                    Rack: {cp.rack_code || "—"} / Shelf: {cp.shelf_code || "—"}
                  </span>
                  <span className="font-semibold text-emerald-700 uppercase">
                    {cp.condition}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 print:hidden">
          <p className="text-xs text-slate-500">
            💡 Ready for standard 2&quot; &times; 1&quot; or A4 sheet label printing.
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-10 px-4 rounded-xl border-slate-200 text-slate-700 font-semibold"
            >
              Close
            </Button>
            <Button
              type="button"
              onClick={handlePrint}
              className="h-10 px-5 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs gap-1.5"
            >
              <Printer className="h-4 w-4" />
              <span>Print Stickers</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
