"use client";

import React, { useState, useEffect } from "react";
import {
  Truck,
  Plus,
  CheckCircle2,
  FileText,
  Loader2,
  X
} from "lucide-react";
import { inventoryApi, coreApi, showApiError, showSuccess } from "@/lib/inventory-client";

export default function PurchasesAndSuppliersPage() {
  const [activeTab, setActiveTab] = useState<"purchases" | "suppliers">("purchases");
  const [purchases, setPurchases] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [sizes, setSizes] = useState<any[]>([]);
  const [colors, setColors] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Supplier Modal
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [supplierFormData, setSupplierFormData] = useState({
    supplier_name: "",
    contact_person: "",
    phone: "",
    email: "",
    address: "",
    gst_number: "",
  });

  // Purchase Modal
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [purchaseForm, setPurchaseForm] = useState({
    supplier: "",
    academic_year: "",
    invoice_number: "",
    purchase_date: new Date().toISOString().split("T")[0],
    payment_status: "PAID",
    notes: "",
    items: [
      { item: "", size: "", color: "", quantity: 1, unit_cost: "0.00", tax: "0.00", discount: "0.00", total_amount: "0.00" }
    ]
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [purchRes, suppRes, itemsRes, sizesRes, colorsRes, yearsRes] = await Promise.all([
        inventoryApi.get("/purchases/"),
        inventoryApi.get("/suppliers/"),
        inventoryApi.get("/items/"),
        inventoryApi.get("/sizes/"),
        inventoryApi.get("/colors/"),
        coreApi.get("/academic-year/").catch(() => ({ data: [] })),
      ]);

      setPurchases(Array.isArray(purchRes.data) ? purchRes.data : purchRes.data.results || []);
      const supps = Array.isArray(suppRes.data) ? suppRes.data : suppRes.data.results || [];
      setSuppliers(supps);
      setItems(Array.isArray(itemsRes.data) ? itemsRes.data : itemsRes.data.results || []);
      setSizes(Array.isArray(sizesRes.data) ? sizesRes.data : sizesRes.data.results || []);
      setColors(Array.isArray(colorsRes.data) ? colorsRes.data : colorsRes.data.results || []);
      const years = Array.isArray(yearsRes.data) ? yearsRes.data : yearsRes.data.results || [];
      setAcademicYears(years);

      if (years.length > 0 && !purchaseForm.academic_year) {
        setPurchaseForm(prev => ({ ...prev, academic_year: years[0].id }));
      }
    } catch (err) {
      console.error("Error fetching purchases data:", err);
      showApiError(err, "Failed to load purchases data.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPurchaseModal = () => {
    setPurchaseForm({
      supplier: suppliers.length > 0 ? suppliers[0].id : "",
      academic_year: academicYears.length > 0 ? academicYears[0].id : "",
      invoice_number: `INV-${Date.now().toString().slice(-6)}`,
      purchase_date: new Date().toISOString().split("T")[0],
      payment_status: "PAID",
      notes: "",
      items: [
        { item: items.length > 0 ? items[0].id : "", size: "", color: "", quantity: 10, unit_cost: "500.00", tax: "0.00", discount: "0.00", total_amount: "5000.00" }
      ]
    });
    setIsPurchaseModalOpen(true);
  };

  const handleAddItemRow = () => {
    setPurchaseForm(prev => ({
      ...prev,
      items: [
        ...prev.items,
        { item: items.length > 0 ? items[0].id : "", size: "", color: "", quantity: 1, unit_cost: "0.00", tax: "0.00", discount: "0.00", total_amount: "0.00" }
      ]
    }));
  };

  const handleRemoveItemRow = (index: number) => {
    if (purchaseForm.items.length === 1) return;
    setPurchaseForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    setPurchaseForm(prev => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };

      // Recalculate row total
      const qty = Number(newItems[index].quantity) || 0;
      const cost = Number(newItems[index].unit_cost) || 0;
      const tax = Number(newItems[index].tax) || 0;
      const disc = Number(newItems[index].discount) || 0;
      newItems[index].total_amount = ((qty * cost) + tax - disc).toFixed(2);

      return { ...prev, items: newItems };
    });
  };

  const calculateGrandTotal = () => {
    return purchaseForm.items.reduce((sum, it) => sum + (Number(it.total_amount) || 0), 0).toFixed(2);
  };

  const handleSavePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const grandTotal = calculateGrandTotal();
      const payload = {
        supplier: Number(purchaseForm.supplier),
        academic_year: Number(purchaseForm.academic_year),
        invoice_number: purchaseForm.invoice_number,
        purchase_date: purchaseForm.purchase_date,
        subtotal: grandTotal,
        discount: "0.00",
        tax: "0.00",
        grand_total: grandTotal,
        payment_status: purchaseForm.payment_status,
        status: "CONFIRMED", // Auto restocks inventory upon creation
        notes: purchaseForm.notes,
        items: purchaseForm.items.map(it => ({
          item: Number(it.item),
          size: it.size ? Number(it.size) : null,
          color: it.color ? Number(it.color) : null,
          quantity: Number(it.quantity),
          unit_cost: it.unit_cost,
          tax: it.tax,
          discount: it.discount,
          total_amount: it.total_amount,
        }))
      };

      await inventoryApi.post("/purchases/", payload);
      showSuccess("Purchase invoice confirmed & stock updated successfully");
      setIsPurchaseModalOpen(false);
      fetchInitialData();
    } catch (err: any) {
      showApiError(err, "Failed to create purchase invoice.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await inventoryApi.post("/suppliers/", supplierFormData);
      showSuccess("Supplier registered successfully");
      setIsSupplierModalOpen(false);
      setSupplierFormData({
        supplier_name: "",
        contact_person: "",
        phone: "",
        email: "",
        address: "",
        gst_number: "",
      });
      fetchInitialData();
    } catch (err: any) {
      showApiError(err, "Failed to save supplier.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Truck className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Purchases & Supplier Invoices
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Procure inventory batches from approved suppliers and automatically update physical stock.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSupplierModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-sm font-semibold hover:bg-slate-50 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4 text-slate-500" /> Add Supplier
          </button>
          <button
            onClick={() => handleOpenPurchaseModal()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#5826df] hover:bg-[#4a1ec2] text-white text-sm font-semibold shadow-md shadow-indigo-500/20 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" /> New Purchase Order
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab("purchases")}
          className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === "purchases"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          <FileText className="w-4 h-4" /> Purchase Invoices ({purchases.length})
        </button>

        <button
          onClick={() => setActiveTab("suppliers")}
          className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === "suppliers"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          <Truck className="w-4 h-4" /> Supplier Directory ({suppliers.length})
        </button>
      </div>

      {/* Tab Content */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mr-2" /> Loading records...
          </div>
        ) : activeTab === "purchases" ? (
          purchases.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Truck className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <div className="text-base font-semibold text-slate-700 dark:text-slate-300">No Purchase Invoices Found</div>
              <p className="text-xs mt-1">Record supplier purchase bills to add physical stock to items.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/75 dark:bg-slate-800/50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Invoice #</th>
                    <th className="py-3.5 px-4">Supplier</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Academic Year</th>
                    <th className="py-3.5 px-4">Items Count</th>
                    <th className="py-3.5 px-4">Grand Total</th>
                    <th className="py-3.5 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {purchases.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-900 dark:text-white">
                        {p.invoice_number}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-medium">
                        {p.supplier_name || "Direct / Internal"}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {p.purchase_date}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                        {p.academic_year_name}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-slate-300">
                        {p.items ? p.items.length : 0} items
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        ₹{Number(p.grand_total).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                          p.status === "CONFIRMED"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                        }`}>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* Suppliers Directory */
          suppliers.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Truck className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <div className="text-base font-semibold text-slate-700 dark:text-slate-300">No Suppliers Registered</div>
              <p className="text-xs mt-1">Register suppliers to streamline purchase order creation.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
              {suppliers.map((s) => (
                <div
                  key={s.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500/40 hover:shadow-md transition-all space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">{s.supplier_name}</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      Active
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">Contact: {s.contact_person || "N/A"}</div>
                  <div className="text-xs text-slate-500">Phone: {s.phone || "N/A"}</div>
                  <div className="text-xs text-slate-500">GST: {s.gst_number || "Unregistered"}</div>
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-blue-600 dark:text-blue-400">
                    <span>{s.total_purchases_count || 0} Invoices</span>
                    <span>₹{Number(s.total_purchases_amount || 0).toLocaleString()} Total</span>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* New Purchase Order Modal */}
      {isPurchaseModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-600" />
                Create Purchase Invoice & Restock Inventory
              </h2>
              <button
                onClick={() => setIsPurchaseModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePurchase} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Supplier <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={purchaseForm.supplier}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, supplier: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.supplier_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Invoice # <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={purchaseForm.invoice_number}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, invoice_number: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Purchase Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={purchaseForm.purchase_date}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, purchase_date: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              {/* Line Items Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Purchase Line Items
                  </span>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Row
                  </button>
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">Item</th>
                        <th className="py-2.5 px-3">Size</th>
                        <th className="py-2.5 px-3">Color</th>
                        <th className="py-2.5 px-3 w-20">Qty</th>
                        <th className="py-2.5 px-3 w-28">Unit Cost (₹)</th>
                        <th className="py-2.5 px-3 w-28">Total (₹)</th>
                        <th className="py-2.5 px-2 text-center w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {purchaseForm.items.map((row, idx) => (
                        <tr key={idx} className="bg-white dark:bg-slate-900">
                          <td className="p-2">
                            <select
                              required
                              value={row.item}
                              onChange={(e) => handleItemChange(idx, "item", e.target.value)}
                              className="w-full px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                            >
                              <option value="">Select Item</option>
                              {items.map((it) => (
                                <option key={it.id} value={it.id}>{it.item_name}</option>
                              ))}
                            </select>
                          </td>
                          <td className="p-2">
                            <select
                              value={row.size}
                              onChange={(e) => handleItemChange(idx, "size", e.target.value)}
                              className="w-full px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                            >
                              <option value="">None</option>
                              {sizes.map((s) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                              ))}
                            </select>
                          </td>
                          <td className="p-2">
                            <select
                              value={row.color}
                              onChange={(e) => handleItemChange(idx, "color", e.target.value)}
                              className="w-full px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                            >
                              <option value="">None</option>
                              {colors.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                            </select>
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              min="1"
                              required
                              value={row.quantity}
                              onChange={(e) => handleItemChange(idx, "quantity", e.target.value)}
                              className="w-full px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              required
                              value={row.unit_cost}
                              onChange={(e) => handleItemChange(idx, "unit_cost", e.target.value)}
                              className="w-full px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                            />
                          </td>
                          <td className="p-2 font-bold text-slate-900 dark:text-white">
                            ₹{Number(row.total_amount).toLocaleString()}
                          </td>
                          <td className="p-2 text-center">
                            {purchaseForm.items.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveItemRow(idx)}
                                className="text-slate-400 hover:text-red-500"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Summary Bar */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                <span className="text-xs text-slate-500 font-medium">Grand Total Payable:</span>
                <span className="text-lg font-bold text-slate-900 dark:text-white">
                  ₹{Number(calculateGrandTotal()).toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPurchaseModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#5826df] hover:bg-[#4a1ec2] text-white text-sm font-semibold shadow-md shadow-indigo-500/20 active:scale-95 transition-all disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Confirm & Restock Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Supplier Modal */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Add New Supplier</h2>
              <button
                onClick={() => setIsSupplierModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Supplier / Vendor Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Uniforms & Garments Pvt Ltd"
                  value={supplierFormData.supplier_name}
                  onChange={(e) => setSupplierFormData({ ...supplierFormData, supplier_name: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Rajesh Sharma"
                    value={supplierFormData.contact_person}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, contact_person: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="+91 98765 43210"
                    value={supplierFormData.phone}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, phone: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  GST Number (Optional)
                </label>
                <input
                  type="text"
                  placeholder="24AAAAA0000A1Z5"
                  value={supplierFormData.gst_number}
                  onChange={(e) => setSupplierFormData({ ...supplierFormData, gst_number: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsSupplierModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#5826df] hover:bg-[#4a1ec2] text-white text-sm font-semibold shadow-md shadow-indigo-500/20 active:scale-95 transition-all disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
