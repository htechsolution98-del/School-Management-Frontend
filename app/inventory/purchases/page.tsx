"use client";

import React, { useState, useEffect } from "react";
import {
  Truck,
  Plus,
  CheckCircle2,
  FileText,
  Loader2,
  X,
  Pencil,
  Search,
  Calendar,
  Eye,
  FileDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { inventoryApi, coreApi, showApiError, showSuccess } from "@/lib/inventory-client";
import { toast } from "sonner";

const isValidIndianMobileNumber = (value: string): boolean =>
  value === "" || /^[6-9][0-9]{9}$/.test(value);

// Client-side cache for static dropdown reference data
let cachedDropdowns: {
  suppliers?: any[];
  items?: any[];
  sizes?: any[];
  colors?: any[];
  academicYears?: any[];
  timestamp?: number;
} | null = null;
const DROPDOWN_CACHE_TTL_MS = 5 * 60 * 1000;

export default function PurchasesAndSuppliersPage() {
  const [activeTab, setActiveTab] = useState<"purchases" | "suppliers">("purchases");
  const [purchases, setPurchases] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [sizes, setSizes] = useState<any[]>([]);
  const [colors, setColors] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPurchases, setLoadingPurchases] = useState(false);
  const [loadingDetailsId, setLoadingDetailsId] = useState<number | null>(null);
  const [downloadingPdfId, setDownloadingPdfId] = useState<number | null>(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 20;

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Details Modal state
  const [selectedPurchase, setSelectedPurchase] = useState<any | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Supplier Modal
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [editingSupplierId, setEditingSupplierId] = useState<number | null>(null);
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
    fetchDropdownData();
  }, []);

  useEffect(() => {
    fetchPurchases(1);
  }, [fromDate, toDate]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPurchases(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchDropdownData = async (forceRefresh = false) => {
    if (!forceRefresh && cachedDropdowns && Date.now() - (cachedDropdowns.timestamp || 0) < DROPDOWN_CACHE_TTL_MS) {
      if (cachedDropdowns.suppliers) setSuppliers(cachedDropdowns.suppliers);
      if (cachedDropdowns.items) setItems(cachedDropdowns.items);
      if (cachedDropdowns.sizes) setSizes(cachedDropdowns.sizes);
      if (cachedDropdowns.colors) setColors(cachedDropdowns.colors);
      if (cachedDropdowns.academicYears) setAcademicYears(cachedDropdowns.academicYears);
      return;
    }

    try {
      const [suppRes, itemsRes, sizesRes, colorsRes, yearsRes] = await Promise.all([
        inventoryApi.get("/suppliers/"),
        inventoryApi.get("/items/"),
        inventoryApi.get("/sizes/"),
        inventoryApi.get("/colors/"),
        coreApi.get("/academic-year/").catch(() => ({ data: [] })),
      ]);

      const supps = Array.isArray(suppRes.data) ? suppRes.data : suppRes.data.results || [];
      const itms = Array.isArray(itemsRes.data) ? itemsRes.data : itemsRes.data.results || [];
      const szs = Array.isArray(sizesRes.data) ? sizesRes.data : sizesRes.data.results || [];
      const cols = Array.isArray(colorsRes.data) ? colorsRes.data : colorsRes.data.results || [];
      const yrs = Array.isArray(yearsRes.data) ? yearsRes.data : yearsRes.data.results || [];

      cachedDropdowns = {
        suppliers: supps,
        items: itms,
        sizes: szs,
        colors: cols,
        academicYears: yrs,
        timestamp: Date.now(),
      };

      setSuppliers(supps);
      setItems(itms);
      setSizes(szs);
      setColors(cols);
      setAcademicYears(yrs);

      if (yrs.length > 0 && !purchaseForm.academic_year) {
        setPurchaseForm(prev => ({ ...prev, academic_year: yrs[0].id }));
      }
    } catch (err) {
      console.error("Error fetching dropdown data:", err);
      showApiError(err, "Failed to load reference dropdown data.");
    }
  };

  const fetchPurchases = async (targetPage = 1) => {
    setLoading(true);
    setLoadingPurchases(true);
    try {
      const params: any = { page: targetPage };
      if (fromDate) params.from_date = fromDate;
      if (toDate) params.to_date = toDate;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const purchRes = await inventoryApi.get("/purchases/", { params });
      const data = purchRes.data;
      if (data && typeof data === "object" && "results" in data) {
        setPurchases(data.results || []);
        const count = Number(data.count) || 0;
        setTotalCount(count);
        setTotalPages(Math.max(1, Math.ceil(count / pageSize)));
      } else {
        const list = Array.isArray(data) ? data : [];
        setPurchases(list);
        setTotalCount(list.length);
        setTotalPages(Math.max(1, Math.ceil(list.length / pageSize)));
      }
      setPage(targetPage);
    } catch (err) {
      console.error("Error fetching purchases:", err);
      showApiError(err, "Failed to load purchases data.");
    } finally {
      setLoading(false);
      setLoadingPurchases(false);
    }
  };

  const filteredPurchases = purchases.filter((p) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const invMatch = (p.invoice_number || "").toLowerCase().includes(q);
      const suppMatch = (p.supplier_name || "").toLowerCase().includes(q);
      if (!invMatch && !suppMatch) return false;
    }
    if (fromDate) {
      if (!p.purchase_date || p.purchase_date < fromDate) return false;
    }
    if (toDate) {
      if (!p.purchase_date || p.purchase_date > toDate) return false;
    }
    return true;
  });

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
      if (field === "item") {
        newItems[index] = { ...newItems[index], size: "", color: "" };
      }

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

    // Maximum Stock Capacity Validation (Row 53)
    const itemQuantities: Record<number, number> = {};
    for (const line of purchaseForm.items) {
      if (line.item) {
        const itemId = Number(line.item);
        const qty = Number(line.quantity) || 0;
        itemQuantities[itemId] = (itemQuantities[itemId] || 0) + qty;
      }
    }

    for (const [itemIdStr, purchaseQty] of Object.entries(itemQuantities)) {
      const itemObj = items.find((it) => it.id === Number(itemIdStr));
      if (itemObj && itemObj.maximum_stock_level != null) {
        const maxStock = Number(itemObj.maximum_stock_level);
        const currentStock = Number(itemObj.current_stock || 0);
        if (currentStock + purchaseQty > maxStock) {
          toast.error(`Purchase exceeds maximum stock capacity of ${maxStock} for ${itemObj.item_name}.`);
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      const grandTotal = calculateGrandTotal();
      const payload = {
        supplier: purchaseForm.supplier ? Number(purchaseForm.supplier) : null,
        academic_year: purchaseForm.academic_year ? Number(purchaseForm.academic_year) : null,
        invoice_number: purchaseForm.invoice_number ? purchaseForm.invoice_number.trim() : "",
        purchase_date: purchaseForm.purchase_date || null,
        subtotal: grandTotal,
        discount: "0.00",
        tax: "0.00",
        grand_total: grandTotal,
        payment_status: purchaseForm.payment_status,
        status: "CONFIRMED", // Auto restocks inventory upon creation
        notes: purchaseForm.notes || "",
        items: (purchaseForm.items || []).map((it) => ({
          item: it.item ? Number(it.item) : null,
          size: it.size ? Number(it.size) : null,
          color: it.color ? Number(it.color) : null,
          quantity: (it.quantity as any) !== "" && it.quantity !== null && !isNaN(Number(it.quantity)) ? Number(it.quantity) : null,
          unit_cost: it.unit_cost !== "" && it.unit_cost !== null && !isNaN(Number(it.unit_cost)) ? it.unit_cost : null,
          tax: it.tax || "0.00",
          discount: it.discount || "0.00",
          total_amount: it.total_amount || "0.00",
        })),
      };

      await inventoryApi.post("/purchases/", payload);
      showSuccess("Purchase invoice confirmed & stock updated successfully");
      setIsPurchaseModalOpen(false);
      fetchPurchases(1);
    } catch (err: any) {
      showApiError(err, "Failed to create purchase invoice.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadInvoicePdf = async (purchase: any) => {
    if (!purchase || !purchase.id) return;
    setDownloadingPdfId(purchase.id);
    try {
      const res = await inventoryApi.get(`/purchases/${purchase.id}/invoice-pdf/`, {
        responseType: "blob",
      });

      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Purchase_Invoice_${purchase.invoice_number || purchase.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      showSuccess("Purchase invoice PDF downloaded successfully");
    } catch (err) {
      console.error("Failed to download PDF:", err);
      showApiError(err, "Failed to download purchase invoice PDF.");
    } finally {
      setDownloadingPdfId(null);
    }
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();

    setSubmitting(true);
    try {
      const payload = {
        supplier_name: (supplierFormData.supplier_name || "").trim(),
        contact_person: (supplierFormData.contact_person || "").trim(),
        phone: (supplierFormData.phone || "").trim(),
        email: (supplierFormData.email || "").trim(),
        address: (supplierFormData.address || "").trim(),
        gst_number: (supplierFormData.gst_number || "").trim(),
      };
      if (editingSupplierId !== null) {
        await inventoryApi.patch(`/suppliers/${editingSupplierId}/`, payload);
        showSuccess("Supplier updated successfully");
      } else {
        await inventoryApi.post("/suppliers/", payload);
        showSuccess("Supplier registered successfully");
      }
      setIsSupplierModalOpen(false);
      setEditingSupplierId(null);
      setSupplierFormData({
        supplier_name: "",
        contact_person: "",
        phone: "",
        email: "",
        address: "",
        gst_number: "",
      });
      fetchDropdownData(true);
    } catch (err: any) {
      showApiError(err, "Failed to save supplier.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-full space-y-4 sm:space-y-6 px-3 md:px-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Truck className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400 shrink-0" />
            Purchases & Supplier Invoices
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Procure inventory batches from approved suppliers and automatically update physical stock.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
          <button
            onClick={() => {
              setEditingSupplierId(null);
              setSupplierFormData({ supplier_name: "", contact_person: "", phone: "", email: "", address: "", gst_number: "" });
              setIsSupplierModalOpen(true);
            }}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold hover:bg-slate-50 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4 text-slate-500 shrink-0" /> Add Supplier
          </button>
          <button
            onClick={() => handleOpenPurchaseModal()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#5826df] hover:bg-[#4a1ec2] text-white text-xs sm:text-sm font-semibold shadow-md shadow-indigo-500/20 active:scale-95 transition-all whitespace-nowrap"
          >
            <Plus className="w-4 h-4 shrink-0" /> New Purchase Order
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 flex-nowrap overflow-x-auto whitespace-nowrap hide-scrollbar scrollbar-none pb-0.5 sm:pb-0">
        <button
          onClick={() => setActiveTab("purchases")}
          className={`shrink-0 inline-flex items-center gap-2 px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
            activeTab === "purchases"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          <FileText className="w-4 h-4 shrink-0" /> Purchase Invoices ({filteredPurchases.length}{filteredPurchases.length !== purchases.length ? ` / ${purchases.length}` : ""})
        </button>

        <button
          onClick={() => setActiveTab("suppliers")}
          className={`shrink-0 inline-flex items-center gap-2 px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
            activeTab === "suppliers"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          <Truck className="w-4 h-4 shrink-0" /> Supplier Directory ({suppliers.length})
        </button>
      </div>

      {/* Tab Content */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mr-2" /> Loading records...
          </div>
        ) : activeTab === "purchases" ? (
          <div>
            {/* Filter & Search Bar */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Search Input */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by invoice number or supplier name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Date Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span>From:</span>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                  <span>To:</span>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                {(searchQuery || fromDate || toDate) && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setFromDate("");
                      setToDate("");
                    }}
                    className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Clear search and date filters"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>

            {purchases.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <Truck className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <div className="text-base font-semibold text-slate-700 dark:text-slate-300">No Purchase Invoices Found</div>
                <p className="text-xs mt-1">Record supplier purchase bills to add physical stock to items.</p>
              </div>
            ) : filteredPurchases.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <Search className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <div className="text-base font-semibold text-slate-700 dark:text-slate-300">No Matching Invoices Found</div>
                <p className="text-xs mt-1">No invoices match your search query or date range filters.</p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setFromDate("");
                    setToDate("");
                  }}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 text-xs font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="w-full overflow-x-auto hide-scrollbar">
                <table className="w-full min-w-[700px] text-left text-sm">
                  <thead className="bg-slate-50/75 dark:bg-slate-800/50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-3.5 sm:py-3.5 sm:px-4 whitespace-nowrap">Invoice #</th>
                      <th className="py-3 px-3.5 sm:py-3.5 sm:px-4 whitespace-nowrap">Supplier</th>
                      <th className="py-3 px-3.5 sm:py-3.5 sm:px-4 whitespace-nowrap">Date</th>
                      <th className="py-3 px-3.5 sm:py-3.5 sm:px-4 whitespace-nowrap">Academic Year</th>
                      <th className="py-3 px-3.5 sm:py-3.5 sm:px-4 whitespace-nowrap">Items Count</th>
                      <th className="py-3 px-3.5 sm:py-3.5 sm:px-4 whitespace-nowrap">Grand Total</th>
                      <th className="py-3 px-3.5 sm:py-3.5 sm:px-4 whitespace-nowrap">Status</th>
                      <th className="py-3 px-3.5 sm:py-3.5 sm:px-4 text-right whitespace-nowrap">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {filteredPurchases.map((p) => (
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
                          {p.items_count !== undefined ? p.items_count : (p.items ? p.items.length : 0)} items
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
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleDownloadInvoicePdf(p)}
                              disabled={downloadingPdfId === p.id}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-blue-600 transition-all shadow-xs disabled:opacity-50"
                              title="Download Invoice PDF"
                            >
                              {downloadingPdfId === p.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                              ) : (
                                <FileDown className="w-3.5 h-3.5 text-blue-600" />
                              )}
                              <span>PDF</span>
                            </button>
                            <button
                              onClick={async () => {
                                if (p.items && p.items.length > 0) {
                                  setSelectedPurchase(p);
                                  setIsDetailsModalOpen(true);
                                  return;
                                }
                                setLoadingDetailsId(p.id);
                                try {
                                  const res = await inventoryApi.get(`/purchases/${p.id}/`);
                                  setSelectedPurchase(res.data);
                                } catch {
                                  setSelectedPurchase(p);
                                } finally {
                                  setLoadingDetailsId(null);
                                  setIsDetailsModalOpen(true);
                                }
                              }}
                              disabled={loadingDetailsId === p.id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 transition-all shadow-sm disabled:opacity-50"
                              title="View purchase breakdown"
                            >
                              {loadingDetailsId === p.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                              ) : (
                                <Eye className="w-3.5 h-3.5 text-slate-400" />
                              )}
                              View
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
                <div>
                  Showing <strong>{(page - 1) * pageSize + 1}</strong> to{" "}
                  <strong>{Math.min(page * pageSize, totalCount)}</strong> of{" "}
                  <strong>{totalCount}</strong> records
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => fetchPurchases(page - 1)}
                    disabled={page <= 1 || loadingPurchases}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Previous
                  </button>
                  <div className="px-3 py-1.5 font-semibold text-slate-900 dark:text-white">
                    Page {page} of {totalPages}
                  </div>
                  <button
                    onClick={() => fetchPurchases(page + 1)}
                    disabled={page >= totalPages || loadingPurchases}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Next <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
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
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                        {s.is_active ? "Active" : "Inactive"}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingSupplierId(s.id);
                          setSupplierFormData({
                            supplier_name: s.supplier_name || "",
                            contact_person: s.contact_person || "",
                            phone: s.phone || "",
                            email: s.email || "",
                            address: s.address || "",
                            gst_number: s.gst_number || "",
                          });
                          setIsSupplierModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                        aria-label={`Edit ${s.supplier_name}`}
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </button>
                    </div>
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
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-[95%] sm:w-full max-w-3xl mx-auto overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-600 shrink-0" />
                Create Purchase Invoice & Restock Inventory
              </h2>
              <button
                onClick={() => setIsPurchaseModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePurchase} noValidate className="p-4 sm:p-6 space-y-4 max-h-[85vh] sm:max-h-[80vh] overflow-y-auto">
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
                          {(() => {
                            const selectedItem = items.find((item) => item.id === Number(row.item));

                            // Item-specific sizes filter
                            const availableSizes: any[] = (() => {
                              if (!selectedItem || !selectedItem.has_size) return [];
                              const allowed = selectedItem.allowed_sizes;
                              if (Array.isArray(allowed) && allowed.length > 0) {
                                const allowedIds = allowed.map((x: any) => typeof x === "object" ? x.id : Number(x));
                                return sizes.filter((s: any) => s.is_active && allowedIds.includes(s.id));
                              }
                              if (Array.isArray(selectedItem.allowed_size_details) && selectedItem.allowed_size_details.length > 0) {
                                return selectedItem.allowed_size_details;
                              }
                              return sizes.filter((s: any) => s.is_active);
                            })();

                            // Item-specific colors filter
                            const availableColors: any[] = (() => {
                              if (!selectedItem || !selectedItem.has_color) return [];
                              const allowed = selectedItem.allowed_colors;
                              if (Array.isArray(allowed) && allowed.length > 0) {
                                const allowedIds = allowed.map((x: any) => typeof x === "object" ? x.id : Number(x));
                                return colors.filter((c: any) => c.is_active && allowedIds.includes(c.id));
                              }
                              if (Array.isArray(selectedItem.allowed_color_details) && selectedItem.allowed_color_details.length > 0) {
                                return selectedItem.allowed_color_details;
                              }
                              return colors.filter((c: any) => c.is_active);
                            })();

                            return <>
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
                              disabled={!selectedItem || !selectedItem.has_size}
                              required={!!selectedItem?.has_size}
                              value={row.size}
                              onChange={(e) => handleItemChange(idx, "size", e.target.value)}
                              className="w-full px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-800"
                            >
                              <option value="">
                                {!selectedItem ? "Select item" : !selectedItem.has_size ? "None (No Size)" : "Select Size"}
                              </option>
                              {availableSizes.map((s: any) => (
                                <option key={s.id} value={s.id}>
                                  {s.name} {s.size_type && s.size_type !== "General" ? `(${s.size_type})` : ""}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-2">
                            <select
                              disabled={!selectedItem || !selectedItem.has_color}
                              required={!!selectedItem?.has_color}
                              value={row.color}
                              onChange={(e) => handleItemChange(idx, "color", e.target.value)}
                              className="w-full px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-800"
                            >
                              <option value="">
                                {!selectedItem ? "Select item" : !selectedItem.has_color ? "None (No Color)" : "Select Color"}
                              </option>
                              {availableColors.map((c: any) => (
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
                            </>;
                          })()}
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

      {/* Supplier Add/Edit Modal */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-[95%] sm:w-full max-w-md mx-auto overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">{editingSupplierId !== null ? "Edit Supplier" : "Add New Supplier"}</h2>
              <button
                onClick={() => { setIsSupplierModalOpen(false); setEditingSupplierId(null); }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} noValidate className="p-4 sm:p-6 space-y-4">
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
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    maxLength={10}
                    pattern="[0-9]{10}"
                    placeholder="10-digit mobile number"
                    value={supplierFormData.phone}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (/^[0-9]*$/.test(value) && value.length <= 10) {
                        setSupplierFormData({ ...supplierFormData, phone: value });
                      }
                    }}
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
                  onClick={() => { setIsSupplierModalOpen(false); setEditingSupplierId(null); }}
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
                  {editingSupplierId !== null ? "Update Supplier" : "Save Supplier"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Purchase Invoice Details Modal */}
      {isDetailsModalOpen && selectedPurchase && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-[95%] sm:w-full max-w-2xl mx-auto max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-start justify-between p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    Invoice #{selectedPurchase.invoice_number}
                  </h2>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    selectedPurchase.status === "CONFIRMED"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                  }`}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {selectedPurchase.status}
                  </span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                    selectedPurchase.payment_status === "PAID"
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                      : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  }`}>
                    {selectedPurchase.payment_status}
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                  <span><strong>Supplier:</strong> {selectedPurchase.supplier_name || "Direct / Internal"}</span>
                  <span><strong>Date:</strong> {selectedPurchase.purchase_date}</span>
                  {selectedPurchase.academic_year_name && (
                    <span><strong>Academic Year:</strong> {selectedPurchase.academic_year_name}</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => { setIsDetailsModalOpen(false); setSelectedPurchase(null); }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Line Items */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
              {selectedPurchase.notes && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">Notes:</span> {selectedPurchase.notes}
                </div>
              )}

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto hide-scrollbar scrollbar-none">
                <table className="w-full min-w-[500px] text-left text-sm">
                  <thead className="bg-slate-50/75 dark:bg-slate-800/50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3 whitespace-nowrap">Item Name</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">Variant</th>
                      <th className="py-2.5 px-3 text-center whitespace-nowrap">Qty</th>
                      <th className="py-2.5 px-3 text-right whitespace-nowrap">Unit Cost (₹)</th>
                      <th className="py-2.5 px-3 text-right whitespace-nowrap">Subtotal (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                    {!selectedPurchase.items || selectedPurchase.items.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-400">
                          No line items found for this invoice.
                        </td>
                      </tr>
                    ) : (
                      selectedPurchase.items.map((it: any, idx: number) => {
                        const variantLabels = [];
                        if (it.size_name) variantLabels.push(`Size: ${it.size_name}`);
                        if (it.color_name) variantLabels.push(`Color: ${it.color_name}`);
                        const variantText = variantLabels.length > 0 ? variantLabels.join(" | ") : "Standard / None";

                        return (
                          <tr key={it.id || idx} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/30">
                            <td className="py-2.5 px-3">
                              <div className="font-semibold text-slate-900 dark:text-white">
                                {it.item_name || `Item #${it.item}`}
                              </div>
                              {it.item_code && (
                                <div className="text-[10px] font-mono text-slate-400">
                                  {it.item_code}
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                              <span className="inline-block px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[11px]">
                                {variantText}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center font-semibold text-slate-800 dark:text-slate-200">
                              {it.quantity}
                            </td>
                            <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-300">
                              ₹{Number(it.unit_cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-white">
                              ₹{Number(it.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-4 px-6 bg-slate-50/50 dark:bg-slate-950/50 border-t border-slate-200 dark:border-slate-800">
              <div className="text-xs text-slate-500">
                {selectedPurchase.items?.length || 0} Line item{(selectedPurchase.items?.length || 0) === 1 ? "" : "s"}
              </div>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => handleDownloadInvoicePdf(selectedPurchase)}
                  disabled={downloadingPdfId === selectedPurchase.id}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-[#5826df] hover:bg-[#4a1ec2] text-white shadow-md shadow-indigo-500/20 active:scale-95 transition-all disabled:opacity-50"
                  title="Download Official Purchase Invoice PDF"
                >
                  {downloadingPdfId === selectedPurchase.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileDown className="w-4 h-4" />
                  )}
                  Download Invoice PDF
                </button>
                <div className="text-right">
                  <span className="text-xs text-slate-400 block">Grand Total</span>
                  <span className="text-xl font-bold text-slate-900 dark:text-white">
                    ₹{Number(selectedPurchase.grand_total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => { setIsDetailsModalOpen(false); setSelectedPurchase(null); }}
                  className="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
