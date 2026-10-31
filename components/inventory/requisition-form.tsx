"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Boxes,
  Package,
  Plus,
  Send,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  RefreshCw,
  ChevronRight,
  FileCheck,
  FilePlus2,
} from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ResponsiveSelect from "@/components/ui/responsive-select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { inventoryApi, showApiError, showSuccess } from "@/lib/inventory-client";

export interface InventoryItem {
  id: number;
  item_code: string;
  item_name: string;
  category: number | null;
  category_name?: string;
  unit: string;
  current_stock: number;
  stock_status?: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" | string;
  is_active: boolean;
}

export interface RequisitionRecord {
  id: number;
  item: number;
  item_name: string;
  item_code: string;
  unit: string;
  available_stock?: number;
  quantity_requested: number;
  purpose: string;
  status: "Pending" | "Approved" | "Rejected" | string;
  requested_at: string;
  action_date?: string | null;
  action_by_name?: string | null;
  remarks?: string | null;
}

interface RequisitionFormProps {
  roleTitle?: string;
  title?: string;
  description?: string;
  presentation?: "stock-dashboard";
}

export default function StaffRequisitionView({
  roleTitle = "Staff",
  title = "Stock & Consumable Supplies Management",
  description = "Monitor supplies (chalk, dusters, paper, notebooks, pens, markers) and request stock items.",
  presentation,
}: RequisitionFormProps) {
  const getCachedItems = (): InventoryItem[] => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem("sms_inventory_items");
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  };

  const getCachedRequisitions = (): RequisitionRecord[] => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem("sms_inventory_requisitions");
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  };

  const [stockList, setStockList] = useState<InventoryItem[]>(() => getCachedItems());
  const [requests, setRequests] = useState<RequisitionRecord[]>(() => getCachedRequisitions());
  const [loadingItems, setLoadingItems] = useState(() => getCachedItems().length === 0);
  const [loadingRequests, setLoadingRequests] = useState(() => getCachedRequisitions().length === 0);
  const [submitting, setSubmitting] = useState(false);
  const [showAllStock, setShowAllStock] = useState(false);
  const [requestFilter, setRequestFilter] = useState("ALL");
  const [viewingRequest, setViewingRequest] = useState<RequisitionRecord | null>(null);

  // Form State
  const [selectedItemId, setSelectedItemId] = useState<string>(() => {
    const cached = getCachedItems();
    return cached.length > 0 ? cached[0].id.toString() : "";
  });
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState("");

  const selectedStockItem = stockList.find((s) => s.id.toString() === selectedItemId);
  const visibleRequests = requests.filter((request) =>
    requestFilter === "ALL" || String(request.status).toUpperCase() === requestFilter
  );

  const getStockImage = (item: InventoryItem) => {
    const name = `${item.item_name} ${item.category_name || ""}`.toLowerCase();
    if (/chalk|chowk/.test(name)) return "/images/Chowk.jpg";
    if (/duster|eraser/.test(name)) return "/images/Duster.jpg";
    if (/marker|color stick|colour stick|crayon/.test(name)) return "/images/Color-Sticks.jpg";
    if (/notebook|register/.test(name)) return "/images/Notebook.jpg";
    if (/shoe|footwear/.test(name)) return "/images/Shoes.jpg";
    if (/bag|backpack/.test(name)) return "/images/Bag.jpg";
    if (/book|textbook/.test(name)) return "/images/Book.jpg";
    if (/pen|pencil|stationery/.test(name)) return "/images/Pen-cup.jpg";
    return null;
  };

  // Fetch Items list from /api/inventory/items/
  const fetchItems = useCallback(async () => {
    try {
      const res = await inventoryApi.get("/items/");
      const items: InventoryItem[] = Array.isArray(res.data)
        ? res.data
        : res.data?.results || [];
      const activeItems = items.filter((item) => item.is_active !== false);
      setStockList(activeItems);
      if (activeItems.length > 0) {
        try { localStorage.setItem("sms_inventory_items", JSON.stringify(activeItems)); } catch {}
      }

      // Pre-select first item if none selected and items exist
      if (activeItems.length > 0 && !selectedItemId) {
        setSelectedItemId(activeItems[0].id.toString());
      }
    } catch (err) {
      console.error("Failed to load inventory items:", err);
      showApiError(err, "Failed to load supply items catalog.");
    } finally {
      setLoadingItems(false);
    }
  }, [selectedItemId]);

  // Fetch Requisitions list from /api/inventory/requisitions/
  const fetchRequests = useCallback(async () => {
    try {
      const res = await inventoryApi.get("/requisitions/");
      const data: RequisitionRecord[] = Array.isArray(res.data)
        ? res.data
        : res.data?.results || [];
      setRequests(data);
      if (data.length > 0) {
        try { localStorage.setItem("sms_inventory_requisitions", JSON.stringify(data)); } catch {}
      }
    } catch (err) {
      console.error("Failed to load requisitions:", err);
      showApiError(err, "Failed to load requisition requests.");
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
    fetchRequests();
  }, [fetchItems, fetchRequests]);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();

    const matchedItem = stockList.find((s) => s.id.toString() === selectedItemId);
    const qtyNumber = quantity !== undefined && quantity !== null && !isNaN(Number(quantity)) ? Number(quantity) : null;

    try {
      setSubmitting(true);
      const payload = {
        item: selectedItemId ? Number(selectedItemId) : null,
        quantity_requested: qtyNumber,
        purpose: (reason || "").trim(),
      };

      const res = await inventoryApi.post("/requisitions/", payload);
      const createdItemName = matchedItem?.item_name || res.data?.item_name || "item";

      showSuccess(
        "Requisition Submitted",
        `Supply requisition requested for ${qtyNumber} ${matchedItem?.unit || "units"} of ${createdItemName}.`
      );

      // Reset form
      setQuantity(1);
      setReason("");

      // Refresh table to immediately show new Pending entry
      await fetchRequests();
    } catch (err) {
      console.error("Failed to submit requisition:", err);
      showApiError(err, "Failed to submit requisition request.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const renderStatusBadge = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === "approved" || s === "fulfilled") {
      return (
        <Badge className="text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300/60 inline-flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" /> Approved
        </Badge>
      );
    }
    if (s === "rejected") {
      return (
        <Badge className="text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300/60 inline-flex items-center gap-1">
          <XCircle className="h-3 w-3" /> Rejected
        </Badge>
      );
    }
    return (
      <Badge className="text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300/60 inline-flex items-center gap-1">
        <Clock className="h-3 w-3" /> Pending Approval
      </Badge>
    );
  };

  if (presentation === "stock-dashboard") {
    return (
      <div className="mx-auto w-full min-w-0 max-w-[1500px] space-y-4 overflow-x-hidden px-3 py-4 pb-28 font-sans text-slate-900 sm:space-y-5 sm:px-5 sm:py-5 lg:px-7 lg:pb-8">
        <section className="relative isolate min-h-[285px] overflow-hidden rounded-[1.6rem] border border-blue-100 bg-gradient-to-br from-white via-[#eaf4ff] to-[#cfe4ff] p-5 shadow-[0_14px_40px_-24px_rgba(37,99,235,.5)] sm:min-h-[300px] sm:rounded-[2rem] sm:p-8 lg:min-h-[320px] lg:p-10">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_78%_18%,rgba(59,130,246,.28),transparent_42%),linear-gradient(110deg,transparent_42%,rgba(59,130,246,.2))]" />
          <div className="pointer-events-none absolute -right-24 -top-40 -z-10 h-[480px] w-[480px] rounded-full border border-white/70 bg-white/20" />
          <div className="relative z-10 max-w-[620px]">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-100/75 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wide text-indigo-700 sm:text-xs">
              <Boxes className="h-4 w-4" /> Stock Management · {roleTitle}
            </div>
            <h1 className="mt-4 max-w-[620px] text-[1.75rem] font-black leading-[1.08] tracking-tight text-[#101d4a] sm:text-4xl lg:text-[2.8rem]">
              Stock &amp; Consumable Supplies <span className="text-blue-700">Management</span>
            </h1>
            <p className="mt-3 max-w-[560px] text-sm leading-relaxed text-slate-600 sm:text-base lg:text-lg">
              {description}
            </p>
            <div className="mt-5 flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => { void fetchItems(); void fetchRequests(); }}
                aria-label="Refresh stock and requests"
                title="Refresh"
                className="h-12 w-12 rounded-2xl border-blue-100 bg-white/85 text-slate-600 shadow-sm hover:bg-white"
              >
                <RefreshCw className={`h-5 w-5 ${loadingRequests || loadingItems ? "animate-spin" : ""}`} />
              </Button>
              <span className="hidden text-xs font-semibold text-blue-800/70 sm:inline sm:text-sm">Live school supply inventory</span>
            </div>
          </div>
          <div className="pointer-events-none absolute bottom-[-16px] right-[-18px] hidden h-[132px] w-[138px] overflow-hidden rounded-[1.25rem] border border-white/80 bg-white/80 shadow-lg opacity-45 sm:bottom-4 sm:right-[3%] sm:block sm:h-[205px] sm:w-[220px] sm:rounded-[1.8rem] sm:opacity-100 lg:right-[5%] lg:h-[230px] lg:w-[245px]">
            <img src="/images/Pen-cup.jpg" alt="Colorful school stationery in a pen cup" className="h-full w-full object-cover object-center" />
          </div>
          <div className="pointer-events-none absolute bottom-8 right-[22%] hidden h-[92px] w-[105px] overflow-hidden rounded-2xl border-4 border-white/90 bg-white shadow-lg sm:block lg:right-[25%]">
            <img src="/images/Book.jpg" alt="Stack of colorful school books" className="h-full w-full object-cover" />
          </div>
          <div className="pointer-events-none absolute bottom-8 right-[1%] hidden h-[76px] w-[76px] overflow-hidden rounded-2xl border-4 border-white/90 bg-white shadow-lg sm:block lg:right-[1%]">
            <img src="/images/Bag.jpg" alt="School bag" className="h-full w-full object-cover" />
          </div>
        </section>

        <section aria-labelledby="quick-stock-overview">
          <div className="mb-3 flex items-center justify-between gap-3 px-1">
            <h2 id="quick-stock-overview" className="text-base font-black tracking-tight text-[#142044] sm:text-lg">Quick Stock Overview</h2>
            {stockList.length > 4 && (
              <button type="button" onClick={() => setShowAllStock((current) => !current)} className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-900">
                {showAllStock ? "Show less" : "View all"}<ChevronRight className={`h-4 w-4 transition-transform ${showAllStock ? "rotate-90" : ""}`} />
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-2 sm:gap-3.5 xl:grid-cols-4">
            {loadingItems ? (
              Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-44 animate-pulse rounded-2xl border border-blue-50 bg-white/80" />)
            ) : stockList.length === 0 ? (
              <div className="col-span-full rounded-2xl border border-dashed border-blue-200 bg-white/80 px-4 py-8 text-center text-sm text-slate-500">No inventory items are registered in your school store yet.</div>
            ) : (showAllStock ? stockList : stockList.slice(0, 4)).map((item, index) => {
              const status = (item.stock_status || "").toUpperCase();
              const isOut = status === "OUT_OF_STOCK" || Number(item.current_stock) <= 0;
              const isLow = status === "LOW_STOCK";
              return (
                <article key={item.id} className="relative min-w-0 rounded-2xl border border-slate-100 bg-white/95 p-3.5 shadow-[0_6px_20px_-16px_rgba(15,23,42,.35)] sm:p-4">
                  <div className="flex min-h-[68px] items-start justify-between gap-1.5">
                    <div className={`flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl ${["bg-blue-50 text-blue-600", "bg-violet-50 text-violet-600", "bg-emerald-50 text-emerald-600", "bg-amber-50 text-amber-600"][index % 4]}`}>
                      {getStockImage(item) ? (
                        <img src={getStockImage(item)!} alt="" className="h-full w-full object-contain p-1" />
                      ) : (
                        <Package className="h-7 w-7" />
                      )}
                    </div>
                    <span className={`max-w-[72%] rounded-full px-2 py-1 text-[9px] font-extrabold leading-tight sm:text-[10px] ${isOut ? "bg-rose-50 text-rose-600" : isLow ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-600"}`}>
                      {isOut ? "Out of stock" : isLow ? "Low stock" : "In stock"}
                    </span>
                  </div>
                  <h3 className="mt-2 line-clamp-2 min-h-10 text-xs font-extrabold leading-snug text-[#142044] sm:text-sm" title={item.item_name}>{item.item_name}</h3>
                  <p className="text-[11px] text-slate-500">Unit: {item.unit || "—"}</p>
                  <p className={`mt-1 text-xl font-black ${isOut ? "text-rose-500" : "text-emerald-600"}`}>{item.current_stock ?? 0}</p>
                  <p className="-mt-0.5 text-[11px] text-slate-400">Available</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="rounded-[1.6rem] border border-blue-50 bg-white p-4 shadow-[0_8px_30px_-22px_rgba(15,23,42,.3)] sm:rounded-[1.8rem] sm:p-6 lg:p-7">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><FilePlus2 className="h-6 w-6" /></div>
            <div className="min-w-0">
              <h2 className="text-lg font-black tracking-tight text-[#142044] sm:text-xl">Request Stock Item</h2>
              <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">Select an item, quantity and purpose to request supplies from the office.</p>
            </div>
          </div>
          <form onSubmit={handleRequest} noValidate className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.2fr_.8fr]">
              <div className="space-y-1.5">
                <label htmlFor="stock-item-select" className="text-xs font-bold text-slate-700 sm:text-sm">Select Supply Item <span className="text-rose-500">*</span></label>
                <ResponsiveSelect
                  id="stock-item-select"
                  drawerTitle="Select Supply Item"
                  drawerSubtitle="Choose an item from your school’s stock catalog"
                  value={selectedItemId}
                  onChange={(event) => setSelectedItemId(event.target.value)}
                  disabled={loadingItems || stockList.length === 0}
                  className="h-12 w-full rounded-2xl border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700"
                >
                  {!selectedItemId && <option value="" disabled>{loadingItems ? "Loading items..." : "Select item"}</option>}
                  {stockList.map((item) => <option key={item.id} value={item.id.toString()}>{item.item_name} · {item.current_stock ?? 0} {item.unit} available</option>)}
                </ResponsiveSelect>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="stock-quantity" className="flex items-center justify-between gap-2 text-xs font-bold text-slate-700 sm:text-sm">
                  <span>Quantity Needed <span className="text-rose-500">*</span></span>
                  {selectedStockItem && <span className="font-medium text-slate-400">Unit: {selectedStockItem.unit}</span>}
                </label>
                <Input id="stock-quantity" type="number" min={1} max={1000} value={quantity} onChange={(event) => setQuantity(Number(event.target.value) || 0)} className="h-12 rounded-2xl border-slate-200 bg-slate-50 px-4 text-sm font-semibold" placeholder="Enter quantity" required />
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="stock-purpose" className="text-xs font-bold text-slate-700 sm:text-sm">Purpose / Remarks <span className="text-rose-500">*</span></label>
              <textarea id="stock-purpose" maxLength={200} value={reason} onChange={(event) => setReason(event.target.value)} className="min-h-[84px] w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100" placeholder="e.g. Daily office work or lecture requirements..." required />
              <p className="text-right text-[11px] text-slate-400">{reason.length}/200</p>
            </div>
            <Button type="submit" disabled={submitting || loadingItems || stockList.length === 0} className="h-12 w-full rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 text-sm font-extrabold text-white shadow-md shadow-blue-600/15 hover:from-blue-700 hover:to-violet-700">
              {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting request...</> : <><Send className="mr-2 h-4 w-4" />Submit Requisition Request</>}
            </Button>
          </form>
        </section>

        <section className="overflow-hidden rounded-[1.6rem] border border-blue-50 bg-white shadow-[0_8px_30px_-22px_rgba(15,23,42,.3)] sm:rounded-[1.8rem]">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><FileCheck className="h-5 w-5" /></div>
              <div className="min-w-0">
                <h2 className="text-base font-black text-[#142044] sm:text-lg">My Requisition Requests ({requests.length})</h2>
                <p className="text-xs text-slate-500">Track the status of your requested supplies.</p>
              </div>
            </div>
            <ResponsiveSelect drawerTitle="Filter Requests" value={requestFilter} onChange={(event) => setRequestFilter(event.target.value)} className="h-10 w-full rounded-xl border-slate-200 bg-slate-50 px-3 text-xs font-bold sm:w-40">
              <option value="ALL">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </ResponsiveSelect>
          </div>

          {loadingRequests ? (
            <div className="flex min-h-40 items-center justify-center gap-2 text-xs font-semibold text-slate-500"><Loader2 className="h-5 w-5 animate-spin text-blue-600" />Loading requisition requests...</div>
          ) : visibleRequests.length === 0 ? (
            <div className="py-8 text-center">
              <img src="/images/empty-folder.png" alt="No requisitions found" className="mx-auto mb-2 h-20 w-20 object-contain" />
              <p className="text-sm font-bold text-slate-700">{requests.length === 0 ? "No requisitions submitted yet" : "No requests match this status"}</p>
              <p className="mt-1 text-xs text-slate-400">Submit a stock request above to see it here.</p>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[680px] text-left text-sm">
                  <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    <tr><th className="px-5 py-3 text-center">#</th><th className="px-5 py-3">Requested Item</th><th className="px-5 py-3 text-center">Quantity</th><th className="px-5 py-3">Request Date</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Action</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visibleRequests.map((request, index) => (
                      <tr key={request.id} className="hover:bg-blue-50/40">
                        <td className="px-5 py-4 text-center text-xs font-bold text-slate-400">{index + 1}</td>
                        <td className="px-5 py-4"><p className="font-bold text-slate-900">{request.item_name}</p><p className="mt-0.5 max-w-md truncate text-xs text-slate-500">{request.purpose}</p>{request.remarks && <p className="mt-0.5 text-xs italic text-blue-600">Approver note: {request.remarks}</p>}</td>
                        <td className="px-5 py-4 text-center font-bold text-blue-700">{request.quantity_requested} {request.unit}</td>
                        <td className="px-5 py-4 text-sm text-slate-500">{formatDate(request.requested_at)}</td>
                        <td className="px-5 py-4">{renderStatusBadge(request.status)}</td>
                        <td className="px-5 py-4 text-right"><Button type="button" variant="outline" size="sm" onClick={() => setViewingRequest(request)} className="rounded-xl border-blue-100 text-blue-700">View</Button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="space-y-2.5 p-3 md:hidden">
                {visibleRequests.map((request, index) => (
                  <article key={request.id} className="rounded-2xl border border-slate-100 p-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Requested item</p><h3 className="mt-0.5 truncate text-sm font-extrabold text-[#142044]">{request.item_name}</h3></div>
                      <span className="shrink-0">{renderStatusBadge(request.status)}</span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 text-xs">
                      <div><p className="text-[10px] text-slate-400">Quantity</p><p className="mt-0.5 font-bold text-blue-700">{request.quantity_requested} {request.unit}</p></div>
                      <div><p className="text-[10px] text-slate-400">Request date</p><p className="mt-0.5 font-semibold text-slate-700">{formatDate(request.requested_at)}</p></div>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <p className="min-w-0 truncate text-[11px] text-slate-500">{request.purpose || `Request #${index + 1}`}</p>
                      <Button type="button" variant="outline" size="sm" onClick={() => setViewingRequest(request)} className="h-8 shrink-0 rounded-xl border-blue-100 px-3 text-xs text-blue-700">View</Button>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>

        <Dialog open={!!viewingRequest} onOpenChange={(open) => { if (!open) setViewingRequest(null); }}>
          <DialogContent className="gap-4 rounded-3xl p-5 sm:p-6">
            <DialogHeader>
              <DialogTitle>{viewingRequest?.item_name || "Requisition Details"}</DialogTitle>
              <DialogDescription>Request details and current approval status.</DialogDescription>
            </DialogHeader>
            {viewingRequest && <div className="space-y-3 rounded-2xl bg-slate-50 p-4 text-sm">
              <div className="flex justify-between gap-3"><span className="text-slate-500">Quantity</span><strong>{viewingRequest.quantity_requested} {viewingRequest.unit}</strong></div>
              <div className="flex justify-between gap-3"><span className="text-slate-500">Requested</span><strong>{formatDate(viewingRequest.requested_at)}</strong></div>
              <div className="flex justify-between gap-3"><span className="text-slate-500">Status</span>{renderStatusBadge(viewingRequest.status)}</div>
              <div className="border-t border-slate-200 pt-3"><p className="text-xs font-bold text-slate-500">Purpose / Remarks</p><p className="mt-1 whitespace-pre-wrap text-slate-800">{viewingRequest.purpose || "—"}</p></div>
              {viewingRequest.remarks && <div><p className="text-xs font-bold text-slate-500">Approver Note</p><p className="mt-1 text-slate-800">{viewingRequest.remarks}</p></div>}
            </div>}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-3 sm:pb-5 lg:pb-8 px-3 sm:px-6 py-4 sm:py-6 max-w-7xl mx-auto w-full min-w-0 overflow-x-hidden">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-zinc-100 flex items-center gap-2.5">
            <Boxes className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            {title}
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            {description}
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => {
            fetchItems();
            fetchRequests();
          }}
          className="h-9 w-9 rounded-xl border-zinc-200 dark:border-zinc-800 shrink-0"
          title="Refresh data"
          aria-label="Refresh data"
        >
          <RefreshCw className={`h-4 w-4 ${loadingRequests || loadingItems ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Stock Inventory Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loadingItems ? (
          Array.from({ length: 4 }).map((_, idx) => (
            <Card key={idx} className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-2xs animate-pulse">
              <div className="h-3 w-20 bg-slate-200 dark:bg-zinc-800 rounded mb-2" />
              <div className="h-4 w-32 bg-slate-200 dark:bg-zinc-800 rounded mb-4" />
              <div className="h-6 w-16 bg-slate-200 dark:bg-zinc-800 rounded" />
            </Card>
          ))
        ) : stockList.length === 0 ? (
          <Card className="col-span-full rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 text-center text-xs text-slate-500">
            No inventory items currently registered in your school store.
          </Card>
        ) : (
          stockList.slice(0, 4).map((item) => {
            const stockStatus = (item.stock_status || "").toUpperCase();
            const badgeVariant =
              stockStatus === "OUT_OF_STOCK"
                ? "destructive"
                : stockStatus === "LOW_STOCK"
                ? "secondary"
                : "default";
            const badgeLabel =
              stockStatus === "OUT_OF_STOCK"
                ? "Out of Stock"
                : stockStatus === "LOW_STOCK"
                ? "Low Stock"
                : "In Stock";

            return (
              <Card key={item.id} className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-2xs">
                <div className="flex items-start justify-between">
                  <div className="pr-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {item.category_name || "General"}
                    </p>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-zinc-100 mt-0.5 line-clamp-1" title={item.item_name}>
                      {item.item_name}
                    </h4>
                  </div>
                  <Badge variant={badgeVariant} className="text-[10px] font-bold shrink-0">
                    {badgeLabel}
                  </Badge>
                </div>
                <div className="mt-3 flex items-baseline gap-1.5">
                  <span className="text-xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
                    {item.current_stock ?? 0}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">{item.unit}</span>
                </div>
              </Card>
            );
          })
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Request Form */}
        <Card className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
          <CardHeader className="pb-3 border-b dark:border-zinc-800">
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
              <Plus className="h-4 w-4 text-indigo-600" />
              Request Supply Requisition
            </CardTitle>
            <CardDescription className="text-xs">
              Request consumables and teaching/office items from store manager.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <form onSubmit={handleRequest} noValidate className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Select Supply Item *
                </label>
                <Select
                  value={selectedItemId}
                  onValueChange={(v) => v && setSelectedItemId(v)}
                  disabled={loadingItems || stockList.length === 0}
                >
                  <SelectTrigger className="w-full h-10 text-xs font-bold rounded-xl bg-slate-50 dark:bg-zinc-800/60 border-slate-200 dark:border-zinc-700">
                    <SelectValue placeholder={loadingItems ? "Loading items..." : "Select item"}>
                      {selectedStockItem ? selectedStockItem.item_name : (loadingItems ? "Loading items..." : "Select item")}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="w-auto min-w-full sm:min-w-[360px]">
                    {stockList.map((item) => (
                      <SelectItem
                        key={item.id}
                        value={item.id.toString()}
                        label={item.item_name}
                        className="py-2.5 pr-8 cursor-pointer"
                      >
                        <div className="flex items-center justify-between gap-4 w-full">
                          <span className="font-semibold text-slate-800 dark:text-zinc-100">
                            {item.item_name}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400 dark:text-zinc-400 font-medium shrink-0">
                            ({item.current_stock ?? 0} {item.unit} left)
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center justify-between">
                  <span>Quantity Needed *</span>
                  {selectedStockItem && (
                    <span className="text-[11px] font-normal text-slate-400">
                      Unit: {selectedStockItem.unit}
                    </span>
                  )}
                </label>
                <Input
                  type="number"
                  min={1}
                  max={1000}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value) || 0)}
                  className="h-10 text-xs rounded-xl bg-slate-50 dark:bg-zinc-800/60 font-bold font-mono"
                  placeholder="Enter required quantity"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Purpose / Remarks *
                </label>
                <Input
                  placeholder="e.g. Daily office work or lecture requirements"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="h-10 text-xs rounded-xl bg-slate-50 dark:bg-zinc-800/60 font-medium"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={submitting || loadingItems || stockList.length === 0}
                className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold gap-2 shadow-2xs transition-all"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" /> Submit Requisition Request
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Requisition Status Table */}
        <Card className="lg:col-span-2 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs overflow-hidden">
          <CardHeader className="pb-3 border-b dark:border-zinc-800 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                <Package className="h-4 w-4 text-indigo-600" />
                My Requisition Requests ({requests.length})
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Track status of requested teaching, administrative, and office supplies.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto w-full">
              <table className="w-full min-w-[550px] text-left text-xs">
                <thead className="bg-slate-50/80 dark:bg-zinc-900/80 border-b border-slate-200 dark:border-zinc-800 text-[11px] uppercase tracking-wider font-bold text-slate-500 dark:text-zinc-400">
                  <tr>
                    <th className="px-4 py-3.5 w-12 text-center">#</th>
                    <th className="px-4 py-3.5">Requested Item</th>
                    <th className="px-4 py-3.5 text-center">Quantity</th>
                    <th className="px-4 py-3.5">Request Date</th>
                    <th className="px-4 py-3.5 text-right">Approval Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 font-medium">
                  {loadingRequests ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-500">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                          <span className="text-xs">Loading requisition requests...</span>
                        </div>
                      </td>
                    </tr>
                  ) : requests.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-slate-500">
                        <img
                          src="/images/empty-folder.png"
                          alt="No requisitions"
                          className="w-20 sm:w-24 h-auto object-contain mx-auto mb-3 filter drop-shadow-sm select-none pointer-events-none"
                        />
                        <p className="font-semibold text-slate-700 dark:text-zinc-300">No requisitions submitted yet</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Use the form on the left to request consumable supplies.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    requests.map((r, index) => (
                      <tr key={r.id} className="hover:bg-slate-50/80 dark:hover:bg-zinc-900/50 transition-colors">
                        <td className="px-4 py-3 text-center font-mono text-slate-400">{index + 1}</td>
                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-900 dark:text-zinc-100">{r.item_name}</p>
                          <p className="text-[10px] text-slate-400 truncate max-w-xs">{r.purpose}</p>
                          {r.remarks && (
                            <p className="text-[10px] text-indigo-500 italic mt-0.5">
                              Approver Note: {r.remarks}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center font-bold font-mono text-indigo-600">
                          {r.quantity_requested} {r.unit}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-500">
                          {formatDate(r.requested_at)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {renderStatusBadge(r.status)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
