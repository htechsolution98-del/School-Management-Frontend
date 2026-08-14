"use client";

import { useState } from "react";
import {
  Boxes,
  Package,
  Plus,
  Send,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileSpreadsheet,
  Check,
} from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface StockItem {
  id: string;
  name: string;
  category: string;
  availableQty: number;
  unit: string;
  status: "In Stock" | "Low Stock" | "Out of Stock";
}

interface RequisitionRequest {
  id: string;
  itemName: string;
  quantity: number;
  unit: string;
  reason: string;
  requestDate: string;
  status: "Pending Approval" | "Approved" | "Fulfilled";
}

export default function TeacherStockPage() {
  const [stockList] = useState<StockItem[]>([
    { id: "1", name: "Whiteboard Markers (Blue/Black)", category: "Stationery", availableQty: 45, unit: "Pcs", status: "In Stock" },
    { id: "2", name: "Dustless Chalk Boxes (White)", category: "Classroom Supplies", availableQty: 8, unit: "Boxes", status: "Low Stock" },
    { id: "3", name: "Duster / Blackboard Erasers", category: "Classroom Supplies", availableQty: 18, unit: "Pcs", status: "In Stock" },
    { id: "4", name: "A4 Size Paper Reams (80 GSM)", category: "Office Paper", availableQty: 12, unit: "Reams", status: "In Stock" },
    { id: "5", name: "Student Homework Notebooks", category: "Stationery", availableQty: 150, unit: "Books", status: "In Stock" },
  ]);

  const [requests, setRequests] = useState<RequisitionRequest[]>([
    {
      id: "1",
      itemName: "Whiteboard Markers (Blue/Black)",
      quantity: 5,
      unit: "Pcs",
      reason: "Daily classroom lectures for Std 1 Div A & B",
      requestDate: "2026-08-11",
      status: "Approved",
    },
    {
      id: "2",
      itemName: "Dustless Chalk Boxes (White)",
      quantity: 2,
      unit: "Boxes",
      reason: "Classroom supplies replenishment",
      requestDate: "2026-08-13",
      status: "Pending Approval",
    },
  ]);

  // Form State
  const [selectedItem, setSelectedItem] = useState("Whiteboard Markers (Blue/Black)");
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState("");

  const handleRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) {
      toast.error("Please select a supply item.");
      return;
    }
    if (quantity <= 0) {
      toast.error("Please enter a valid quantity.");
      return;
    }

    const matched = stockList.find((s) => s.name === selectedItem);

    const newReq: RequisitionRequest = {
      id: Date.now().toString(),
      itemName: selectedItem,
      quantity,
      unit: matched?.unit || "Pcs",
      reason: reason.trim() || "Regular classroom teaching supply requirement",
      requestDate: new Date().toISOString().split("T")[0],
      status: "Pending Approval",
    };

    setRequests([newReq, ...requests]);
    toast.success(`📦 Supply Requisition requested for ${quantity} ${newReq.unit} of ${selectedItem}!`);

    // Reset Form
    setQuantity(1);
    setReason("");
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-zinc-100 flex items-center gap-2.5">
            <Boxes className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            Stock & Consumable Supplies Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            Monitor classroom supplies (chalk, dusters, notebooks, pens, markers) and request stock items.
          </p>
        </div>
      </div>

      {/* Stock Inventory Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stockList.slice(0, 4).map((item) => (
          <Card key={item.id} className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-2xs">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.category}</p>
                <h4 className="text-xs font-bold text-slate-900 dark:text-zinc-100 mt-0.5 line-clamp-1">{item.name}</h4>
              </div>
              <Badge
                variant={item.status === "In Stock" ? "default" : "secondary"}
                className="text-[10px] font-bold shrink-0"
              >
                {item.status}
              </Badge>
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-indigo-600 dark:text-indigo-400 font-mono">{item.availableQty}</span>
              <span className="text-xs text-slate-500 font-medium">{item.unit}</span>
            </div>
          </Card>
        ))}
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
              Request consumables from store manager.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <form onSubmit={handleRequest} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">Select Supply Item *</label>
                <Select value={selectedItem} onValueChange={(v) => v && setSelectedItem(v)}>
                  <SelectTrigger className="h-10 text-xs font-bold rounded-xl bg-slate-50 dark:bg-zinc-800/60">
                    <SelectValue placeholder="Select item" />
                  </SelectTrigger>
                  <SelectContent>
                    {stockList.map((item) => (
                      <SelectItem key={item.id} value={item.name}>
                        {item.name} ({item.availableQty} {item.unit} left)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">Quantity Needed *</label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value) || 1)}
                  className="h-10 text-xs rounded-xl bg-slate-50 dark:bg-zinc-800/60 font-bold font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">Purpose / Remarks</label>
                <Input
                  placeholder="e.g. Daily lectures for Std 1 Div A"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="h-10 text-xs rounded-xl bg-slate-50 dark:bg-zinc-800/60 font-medium"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold gap-2 shadow-2xs"
              >
                <Send className="h-4 w-4" /> Submit Requisition Request
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Requisition Status Table */}
        <Card className="lg:col-span-2 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs overflow-hidden">
          <CardHeader className="pb-3 border-b dark:border-zinc-800">
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
              <Package className="h-4 w-4 text-indigo-600" />
              My Requisition Requests ({requests.length})
            </CardTitle>
            <CardDescription className="text-xs">
              Track status of requested teaching and classroom supplies.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
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
                  {requests.map((r, index) => (
                    <tr key={r.id} className="hover:bg-slate-50/80 dark:hover:bg-zinc-900/50 transition-colors">
                      <td className="px-4 py-3 text-center font-mono text-slate-400">{index + 1}</td>
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-900 dark:text-zinc-100">{r.itemName}</p>
                        <p className="text-[10px] text-slate-400 truncate max-w-xs">{r.reason}</p>
                      </td>
                      <td className="px-4 py-3 text-center font-bold font-mono text-indigo-600">
                        {r.quantity} {r.unit}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-500">{r.requestDate}</td>
                      <td className="px-4 py-3 text-right">
                        <Badge
                          className={`text-[10px] font-bold ${
                            r.status === "Fulfilled" || r.status === "Approved"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          }`}
                        >
                          {r.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
