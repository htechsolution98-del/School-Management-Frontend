"use client";

import React, { useState, useMemo } from "react";
import {
  X,
  Search,
  Filter,
  ArrowRightLeft,
  Trash2,
  Printer,
  Plus,
  BookOpen,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BarcodeSvg } from "./BarcodeSvg";
import { Book, BookCopy, Rack, Shelf } from "@/lib/library";

export interface ManageCopiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: Book | null;
  copies: BookCopy[];
  racks: Rack[];
  shelves: Shelf[];
  actionLoading: boolean;
  onGenerateCopies: (count: number, rackId?: number | null, shelfId?: number | null) => Promise<void>;
  onChangeStatus: (copyId: number, status: string) => Promise<void>;
  onTransferClick: (copy: BookCopy) => void;
  onDisposeClick: (copyId: number, accessionNo: string) => void;
  onPrintSticker: (copy: BookCopy) => void;
  onPrintAllBarcodes: (book: Book, copies: BookCopy[]) => void;
}

export function ManageCopiesModal({
  isOpen,
  onClose,
  book,
  copies,
  racks,
  shelves,
  actionLoading,
  onGenerateCopies,
  onChangeStatus,
  onTransferClick,
  onDisposeClick,
  onPrintSticker,
  onPrintAllBarcodes,
}: ManageCopiesModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddForm, setShowAddForm] = useState(false);

  // Add copies form state
  const [addCount, setAddCount] = useState(1);
  const [addRack, setAddRack] = useState("");
  const [addShelf, setAddShelf] = useState("");

  const ITEMS_PER_PAGE = 8;

  // Filtered copies based on search and status
  const filteredCopies = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return copies.filter((cp) => {
      const matchSearch =
        !q ||
        (cp.accession_no && cp.accession_no.toLowerCase().includes(q)) ||
        (cp.barcode && cp.barcode.toLowerCase().includes(q)) ||
        (cp.rack_code && cp.rack_code.toLowerCase().includes(q)) ||
        (cp.shelf_code && cp.shelf_code.toLowerCase().includes(q));

      const matchStatus = statusFilter === "ALL" || cp.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [copies, searchQuery, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredCopies.length / ITEMS_PER_PAGE));
  const validPage = Math.min(currentPage, totalPages);
  const paginatedCopies = useMemo(() => {
    const start = (validPage - 1) * ITEMS_PER_PAGE;
    return filteredCopies.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredCopies, validPage]);

  // Available & active counts
  const availableCount = copies.filter((c) => c.status === "AVAILABLE" && c.is_active).length;
  const issuedCount = copies.filter((c) => c.status === "ISSUED" && c.is_active).length;
  const totalActive = copies.filter((c) => c.is_active).length;

  if (!isOpen || !book) return null;

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (addCount < 1) return;
    await onGenerateCopies(
      Number(addCount),
      addRack ? Number(addRack) : null,
      addShelf ? Number(addShelf) : null
    );
    setAddCount(1);
    setShowAddForm(false);
  };

  return (
    <div className="fixed inset-0 z-[75] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div
        className="bg-white rounded-3xl p-5 sm:p-6 max-w-4xl w-full max-h-[92vh] flex flex-col border border-slate-200 shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4 shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                {book.category || "General"}
              </span>
              <span className="text-xs text-slate-400 font-mono">Book ID #{book.id}</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 line-clamp-1">
              {book.title}
            </h2>
            <p className="text-xs text-slate-500">
              by <span className="font-semibold text-slate-700">{book.author}</span> •{" "}
              <span className="font-bold text-indigo-700">{totalActive}</span> Active Copies (
              <span className="font-bold text-emerald-600">{availableCount} Available</span>,{" "}
              <span className="font-bold text-blue-600">{issuedCount} Issued</span>)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onPrintAllBarcodes(book, copies)}
              className="h-9 px-3 rounded-xl border-slate-200 text-slate-700 hover:text-indigo-700 text-xs font-semibold gap-1.5 shadow-2xs"
              title="Print barcode labels sheet for all physical copies"
            >
              <Printer className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Print All Barcodes</span>
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Toolbar: Search, Filter, and Add Copies Toggle */}
        <div className="py-3.5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-2 flex-1 min-w-[260px]">
            <div className="relative flex-1">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search by Accession / SBIN, Barcode, Rack..."
                className="h-9 pl-9 pr-8 text-xs rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-9 rounded-xl border border-slate-200 bg-white text-xs px-2.5 text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="ALL">All Statuses ({copies.length})</option>
                <option value="AVAILABLE">Available ({availableCount})</option>
                <option value="ISSUED">Issued ({issuedCount})</option>
                <option value="RESERVED">Reserved</option>
                <option value="UNDER_REPAIR">Under Repair</option>
                <option value="DAMAGED">Damaged</option>
                <option value="LOST">Lost</option>
                <option value="DISPOSED">Disposed</option>
              </select>
            </div>
          </div>

          <Button
            type="button"
            size="sm"
            onClick={() => setShowAddForm((prev) => !prev)}
            className="h-9 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold gap-1.5 shadow-2xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{showAddForm ? "Hide Form" : "+ Add Copies"}</span>
          </Button>
        </div>

        {/* Collapsible Add Copies Form */}
        {showAddForm && (
          <form
            onSubmit={handleAddSubmit}
            className="p-3.5 my-2.5 bg-indigo-50/50 border border-indigo-100 rounded-2xl grid grid-cols-1 sm:grid-cols-4 gap-3 items-end animate-in fade-in duration-100 shrink-0"
          >
            <div>
              <Label className="text-xs font-semibold text-slate-800">Number of Copies</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={addCount}
                onChange={(e) => setAddCount(Number(e.target.value))}
                className="h-9 text-xs mt-1 bg-white"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-800">Rack Location</Label>
              <select
                value={addRack}
                onChange={(e) => {
                  setAddRack(e.target.value);
                  setAddShelf("");
                }}
                className="w-full h-9 rounded-xl border border-slate-200 text-xs px-2.5 mt-1 bg-white"
              >
                <option value="">-- Same as Book ({book.rack_code || "None"}) --</option>
                {racks
                  .filter((r) => r.is_active !== false || String(r.id) === String(addRack))
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.rack_code} - {r.rack_name} {r.is_active === false ? " (Deactivated)" : ""}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-800">Shelf Location</Label>
              <select
                value={addShelf}
                onChange={(e) => setAddShelf(e.target.value)}
                disabled={!addRack}
                className="w-full h-9 rounded-xl border border-slate-200 text-xs px-2.5 mt-1 bg-white disabled:bg-slate-100"
              >
                <option value="">-- Same as Book ({book.shelf_code || "None"}) --</option>
                {shelves
                  .filter(
                    (s) =>
                      String(s.rack) === String(addRack) &&
                      (s.is_active !== false || String(s.id) === String(addShelf))
                  )
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.shelf_code} ({s.shelf_name}) {s.is_active === false ? " (Deactivated)" : ""}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <Button
                type="submit"
                disabled={actionLoading}
                className="w-full h-9 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl gap-1 shadow-2xs"
              >
                {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                <span>Generate Copies</span>
              </Button>
            </div>
          </form>
        )}

        {/* Paginated Physical Copies List */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-2 py-2">
          {paginatedCopies.length > 0 ? (
            paginatedCopies.map((copy) => (
              <div
                key={copy.id}
                className="p-3.5 bg-slate-50/70 border border-slate-200/90 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-indigo-300 hover:bg-white transition-all shadow-2xs"
              >
                {/* Left: Identifier, Barcode & Locations */}
                <div className="flex items-start gap-3.5">
                  <div className="h-10 w-10 rounded-xl bg-white border border-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    <BookOpen className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-slate-900 bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs">
                        {copy.accession_no}
                      </span>
                      {copy.barcode && (
                        <span className="font-mono text-[11px] text-slate-500">
                          Barcode: <span className="font-semibold text-slate-700">{copy.barcode}</span>
                        </span>
                      )}
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          copy.status === "AVAILABLE"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : copy.status === "ISSUED"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : copy.status === "RESERVED"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {copy.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-500 flex-wrap">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-slate-400" />
                        Rack: {copy.rack_code || "—"} / Shelf: {copy.shelf_code || "—"}
                      </span>
                      <span>•</span>
                      <span>Condition: <strong className="text-slate-700 uppercase">{copy.condition}</strong></span>
                      {copy.purchase_price && (
                        <>
                          <span>•</span>
                          <span>Price: ₹{copy.purchase_price}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Barcode SVG Preview + Actions */}
                <div className="flex items-center gap-2 self-end md:self-auto flex-wrap">
                  {/* Miniature barcode graphic */}
                  <div className="hidden lg:flex items-center pr-2 border-r border-slate-200">
                    <BarcodeSvg
                      value={copy.barcode || copy.accession_no}
                      width={120}
                      height={32}
                      showText={false}
                    />
                  </div>

                  {/* Print Sticker Button */}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onPrintSticker(copy)}
                    className="h-8 px-2.5 rounded-xl border-slate-200 text-slate-700 hover:text-indigo-700 text-xs font-semibold gap-1"
                    title="Print individual barcode sticker"
                  >
                    <Printer className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Sticker</span>
                  </Button>

                  {/* Status Dropdown */}
                  <select
                    value={copy.status}
                    disabled={copy.status === "ISSUED" || copy.status === "RESERVED" || actionLoading}
                    onChange={(e) => onChangeStatus(copy.id, e.target.value)}
                    className="h-8 text-xs rounded-xl border border-slate-200 bg-white px-2 font-medium disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    <option value="AVAILABLE">Available</option>
                    <option value="ISSUED">Issued (On Loan)</option>
                    <option value="RESERVED">Reserved</option>
                    <option value="UNDER_REPAIR">Under Repair</option>
                    <option value="DAMAGED">Damaged</option>
                    <option value="LOST">Lost</option>
                    <option value="DISPOSED">Disposed</option>
                  </select>

                  {/* Transfer Rack/Shelf */}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onTransferClick(copy)}
                    className="h-8 px-2.5 rounded-xl border-slate-200 text-indigo-600 hover:bg-indigo-50 text-xs font-semibold gap-1"
                    title="Transfer physical copy to another rack or shelf"
                  >
                    <ArrowRightLeft className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Transfer</span>
                  </Button>

                  {/* Dispose */}
                  {copy.status !== "DISPOSED" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => onDisposeClick(copy.id, copy.accession_no)}
                      className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 rounded-xl"
                      title="Decommission / Dispose physical copy"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center text-slate-400 space-y-1">
              <p className="text-sm font-semibold text-slate-600">No physical copies found</p>
              <p className="text-xs">Try adjusting your search query or status filter.</p>
            </div>
          )}
        </div>

        {/* Pagination & Footer */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between shrink-0 text-xs text-slate-500">
          <div>
            Showing{" "}
            <span className="font-bold text-slate-800">
              {filteredCopies.length > 0 ? (validPage - 1) * ITEMS_PER_PAGE + 1 : 0}
            </span>{" "}
            to{" "}
            <span className="font-bold text-slate-800">
              {Math.min(validPage * ITEMS_PER_PAGE, filteredCopies.length)}
            </span>{" "}
            of <span className="font-bold text-slate-800">{filteredCopies.length}</span> copies
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={validPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="h-8 px-2.5 rounded-xl border-slate-200"
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Prev
            </Button>
            <span className="px-2 font-semibold text-slate-700">
              Page {validPage} of {totalPages}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={validPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="h-8 px-2.5 rounded-xl border-slate-200"
            >
              Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
