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
} from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
}

export default function StaffRequisitionView({
  roleTitle = "Staff",
  title = "Stock & Consumable Supplies Management",
  description = "Monitor supplies (chalk, dusters, paper, notebooks, pens, markers) and request stock items.",
}: RequisitionFormProps) {
  const [stockList, setStockList] = useState<InventoryItem[]>([]);
  const [requests, setRequests] = useState<RequisitionRecord[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState("");

  const selectedStockItem = stockList.find((s) => s.id.toString() === selectedItemId);

  // Fetch Items list from /api/inventory/items/
  const fetchItems = useCallback(async () => {
    try {
      setLoadingItems(true);
      const res = await inventoryApi.get("/items/");
      const items: InventoryItem[] = Array.isArray(res.data)
        ? res.data
        : res.data?.results || [];
      const activeItems = items.filter((item) => item.is_active !== false);
      setStockList(activeItems);

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
      setLoadingRequests(true);
      const res = await inventoryApi.get("/requisitions/");
      const data: RequisitionRecord[] = Array.isArray(res.data)
        ? res.data
        : res.data?.results || [];
      setRequests(data);
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

  return (
    <div className="space-y-6 pb-28 lg:pb-8 px-3 sm:px-6 py-4 sm:py-6 max-w-7xl mx-auto w-full min-w-0 overflow-x-hidden">
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
          size="sm"
          onClick={() => {
            fetchItems();
            fetchRequests();
          }}
          className="rounded-xl text-xs font-bold gap-2 border-zinc-200 dark:border-zinc-800 shrink-0"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loadingRequests || loadingItems ? "animate-spin" : ""}`} />
          Refresh Data
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
                      <td colSpan={5} className="py-12 text-center text-slate-500">
                        <Package className="h-8 w-8 mx-auto text-slate-300 dark:text-zinc-700 mb-2" />
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
