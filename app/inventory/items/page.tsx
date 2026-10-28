"use client";

import React, { useState, useEffect } from "react";
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  RotateCw,
  Sliders,
  Tag,
  Loader2,
  X
} from "lucide-react";
import { inventoryApi, showApiError, showSuccess } from "@/lib/inventory-client";
import { toast } from "sonner";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";

export default function ItemMasterPage() {
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [sizes, setSizes] = useState<any[]>([]);
  const [colors, setColors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);

  // Quick Stock Adjustment Modal State
  const [quickAdjustItem, setQuickAdjustItem] = useState<any | null>(null);
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);
  const [quickAdjustForm, setQuickAdjustForm] = useState({
    size: "",
    color: "",
    adjustment_type: "ADJUSTMENT_IN",
    quantity: 1,
    reason: "Quick inventory count correction",
    remarks: "",
  });

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    item_code: "",
    item_name: "",
    category: "",
    description: "",
    unit: "Pcs",
    has_size: false,
    has_color: false,
    allowed_sizes: [] as number[],
    allowed_colors: [] as number[],
    is_returnable: false,
    minimum_stock_level: 5,
    maximum_stock_level: "",
    is_active: true,
  });

  useEffect(() => {
    fetchData();
  }, [categoryFilter, statusFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let itemUrl = "/items/?";
      if (categoryFilter) itemUrl += `category=${categoryFilter}&`;
      if (statusFilter !== "all") itemUrl += `is_active=${statusFilter === "active"}&`;

      const [itemsRes, catRes, sizesRes, colorsRes] = await Promise.all([
        inventoryApi.get(itemUrl),
        inventoryApi.get("/categories/"),
        inventoryApi.get("/sizes/"),
        inventoryApi.get("/colors/"),
      ]);

      setItems(Array.isArray(itemsRes.data) ? itemsRes.data : itemsRes.data.results || []);
      setCategories(Array.isArray(catRes.data) ? catRes.data : catRes.data.results || []);
      setSizes(Array.isArray(sizesRes.data) ? sizesRes.data : sizesRes.data.results || []);
      setColors(Array.isArray(colorsRes.data) ? colorsRes.data : colorsRes.data.results || []);
    } catch (err) {
      console.error("Error fetching items:", err);
      showApiError(err, "Failed to load item catalog.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (item: any = null) => {
    if (item) {
      setEditingItem(item);
      const rawSizes = Array.isArray(item.allowed_sizes) ? item.allowed_sizes : (item.allowed_size_details ? item.allowed_size_details.map((s: any) => s.id) : []);
      const rawColors = Array.isArray(item.allowed_colors) ? item.allowed_colors : (item.allowed_color_details ? item.allowed_color_details.map((c: any) => c.id) : []);

      setFormData({
        item_code: item.item_code,
        item_name: item.item_name,
        category: item.category || "",
        description: item.description || "",
        unit: item.unit || "Pcs",
        has_size: !!item.has_size,
        has_color: !!item.has_color,
        allowed_sizes: rawSizes.map((id: any) => typeof id === "object" ? id.id : Number(id)),
        allowed_colors: rawColors.map((id: any) => typeof id === "object" ? id.id : Number(id)),
        is_returnable: !!item.is_returnable,
        minimum_stock_level: item.minimum_stock_level ?? 5,
        maximum_stock_level: item.maximum_stock_level ?? "",
        is_active: item.is_active !== false,
      });
    } else {
      setEditingItem(null);
      setFormData({
        item_code: `ITEM-${Math.floor(1000 + Math.random() * 9000)}`,
        item_name: "",
        category: categories.length > 0 ? categories[0].id : "",
        description: "",
        unit: "Pcs",
        has_size: false,
        has_color: false,
        allowed_sizes: [],
        allowed_colors: [],
        is_returnable: false,
        minimum_stock_level: 5,
        maximum_stock_level: "",
        is_active: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Enforce variant selection when checkboxes are checked
    if (formData.has_size && (!formData.allowed_sizes || formData.allowed_sizes.length === 0)) {
      toast.error("Please select at least one size variant, or uncheck 'Has Sizes'.");
      return;
    }

    if (formData.has_color && (!formData.allowed_colors || formData.allowed_colors.length === 0)) {
      toast.error("Please select at least one color variant, or uncheck 'Has Color Options'.");
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        ...formData,
        category: formData.category ? Number(formData.category) : null,
        allowed_sizes: formData.has_size ? formData.allowed_sizes : [],
        allowed_colors: formData.has_color ? formData.allowed_colors : [],
        minimum_stock_level: (formData.minimum_stock_level as any) !== "" && formData.minimum_stock_level !== null && !isNaN(Number(formData.minimum_stock_level)) ? Number(formData.minimum_stock_level) : null,
        maximum_stock_level: (formData.maximum_stock_level as any) !== "" && formData.maximum_stock_level !== null && !isNaN(Number(formData.maximum_stock_level)) ? Number(formData.maximum_stock_level) : null,
      };

      if (editingItem) {
        await inventoryApi.put(`/items/${editingItem.id}/`, payload);
        showSuccess("Item updated successfully");
      } else {
        await inventoryApi.post("/items/", payload);
        showSuccess("Item created successfully");
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      showApiError(err, "Failed to save item.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (item: any) => {
    try {
      await inventoryApi.patch(`/items/${item.id}/`, { is_active: !item.is_active });
      showSuccess(`Item marked ${!item.is_active ? "Active" : "Inactive"}`);
      fetchData();
    } catch (err) {
      showApiError(err, "Failed to toggle item status.");
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchData();
      toast.success("Item catalog refreshed successfully");
    } finally {
      setRefreshing(false);
    }
  };

  // Delete Item Confirmation State
  const [itemToDelete, setItemToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirmDeleteItem = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      await inventoryApi.delete(`/items/${itemToDelete.id}/`);
      showSuccess(`Item "${itemToDelete.item_name}" deleted successfully.`);
      setItemToDelete(null);
      fetchData();
    } catch (err: any) {
      showApiError(err, "Failed to delete item.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenQuickAdjust = (item: any) => {
    setQuickAdjustItem(item);
    setQuickAdjustForm({
      size: "",
      color: "",
      adjustment_type: "ADJUSTMENT_IN",
      quantity: 1,
      reason: "Quick inventory count correction",
      remarks: "",
    });
  };

  const handleSaveQuickAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAdjustItem) return;
    setAdjustSubmitting(true);
    try {
      const payload = {
        item: Number(quickAdjustItem.id),
        size: quickAdjustForm.size ? Number(quickAdjustForm.size) : null,
        color: quickAdjustForm.color ? Number(quickAdjustForm.color) : null,
        adjustment_type: quickAdjustForm.adjustment_type,
        quantity: Number(quickAdjustForm.quantity),
        reason: quickAdjustForm.reason.trim(),
        remarks: quickAdjustForm.remarks.trim(),
        adjustment_date: new Date().toISOString().split("T")[0],
      };
      await inventoryApi.post("/adjustments/", payload);
      showSuccess(`Stock adjusted successfully for "${quickAdjustItem.item_name}"`);
      setQuickAdjustItem(null);
      fetchData();
    } catch (err: any) {
      showApiError(err, "Failed to adjust stock.");
    } finally {
      setAdjustSubmitting(false);
    }
  };

  const filteredItems = items.filter((it) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      it.item_name?.toLowerCase().includes(q) ||
      it.item_code?.toLowerCase().includes(q) ||
      it.category_name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4 sm:space-y-6 px-3 md:px-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Package className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400 shrink-0" />
            Item Master Catalog
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Manage school articles (Uniforms, Footwear, Bags, Books, Stationery) and stock configurations.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-xs disabled:opacity-50"
            title="Refresh item catalog data"
            aria-label="Refresh item catalog data"
          >
            <RotateCw className={`w-4 h-4 text-slate-500 shrink-0 ${refreshing ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#5826df] hover:bg-[#4a1ec2] text-white text-xs sm:text-sm font-semibold shadow-md shadow-indigo-500/20 active:scale-95 transition-all whitespace-nowrap"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Add New Item</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 shadow-sm">
        <div className="flex items-center gap-3 w-full sm:flex-1 sm:max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by item name, code, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 focus:outline-none truncate"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mr-2" /> Loading item catalog...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <div className="text-base font-semibold text-slate-700 dark:text-slate-300">No Items Found</div>
            <p className="text-xs mt-1">Add your first item using the &quot;Add New Item&quot; button above.</p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto hide-scrollbar scrollbar-none">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50/75 dark:bg-slate-800/50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 whitespace-nowrap">Item Details</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Category</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Variants & Rules</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Unit</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Live Stock</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Min Stock</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Status</th>
                  <th className="py-3.5 px-4 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    {/* Item Details */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {item.item_name}
                      </div>
                      <div className="text-xs font-mono text-slate-400">
                        Code: {item.item_code}
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium">
                        <Tag className="w-3 h-3 text-slate-400" />
                        {item.category_name || "Unassigned"}
                      </span>
                    </td>

                    {/* Variants */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-1 max-w-[220px]">
                        {item.has_size && (
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 shrink-0">
                              Sizes
                            </span>
                            <span className="text-[11px] text-slate-600 dark:text-slate-300 truncate" title={item.allowed_size_details?.map((s: any) => s.name).join(", ") || "All sizes"}>
                              {item.allowed_size_details && item.allowed_size_details.length > 0
                                ? item.allowed_size_details.map((s: any) => s.name).join(", ")
                                : "All sizes"}
                            </span>
                          </div>
                        )}
                        {item.has_color && (
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 shrink-0">
                              Colors
                            </span>
                            <span className="text-[11px] text-slate-600 dark:text-slate-300 truncate" title={item.allowed_color_details?.map((c: any) => c.name).join(", ") || "All colors"}>
                              {item.allowed_color_details && item.allowed_color_details.length > 0
                                ? item.allowed_color_details.map((c: any) => c.name).join(", ")
                                : "All colors"}
                            </span>
                          </div>
                        )}
                        {!item.has_size && !item.has_color && (
                          <span className="text-xs text-slate-400 font-normal">Standard (No variants)</span>
                        )}
                      </div>
                    </td>

                    {/* Unit */}
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 font-medium">
                      {item.unit}
                    </td>

                    {/* Live Stock & Badge */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {item.current_stock}
                        </span>
                        <button
                          onClick={() => handleOpenQuickAdjust(item)}
                          className="p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-950/50 text-slate-400 hover:text-blue-600 transition-colors"
                          title="Quick Stock Adjustment"
                        >
                          <Sliders className="w-3.5 h-3.5" />
                        </button>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.stock_status === "OUT_OF_STOCK"
                            ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                            : item.stock_status === "LOW_STOCK"
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                            : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                        }`}>
                          {item.stock_status.replace(/_/g, " ")}
                        </span>
                      </div>
                    </td>

                    {/* Min Stock */}
                    <td className="py-3.5 px-4 text-slate-500 font-medium">
                      {item.minimum_stock_level} {item.unit}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggleActive(item)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold cursor-pointer transition-colors ${
                          item.is_active
                            ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
                        }`}
                      >
                        {item.is_active ? "Active" : "Inactive"}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenModal(item)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 hover:text-blue-600 dark:text-slate-400 transition-colors"
                          title="Edit Item"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setItemToDelete(item)}
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-400 hover:text-red-600 transition-colors"
                          title="Delete Item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Item Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-[95%] sm:w-full max-w-xl mx-auto overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {editingItem ? "Edit Item Master" : "Create New Item Master"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} noValidate className="p-4 sm:p-6 space-y-4 max-h-[85vh] sm:max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Item Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.item_code}
                    onChange={(e) => setFormData({ ...formData, item_code: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Item Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Regular School Uniform"
                    value={formData.item_name}
                    onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Unit of Measurement <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="Pcs">Pcs (Pieces)</option>
                    <option value="Pair">Pair (e.g. Shoes, Socks)</option>
                    <option value="Set">Set (e.g. Uniform Set, Kit)</option>
                    <option value="Box">Box</option>
                    <option value="Dozen">Dozen</option>
                    <option value="Meter">Meter</option>
                    <option value="Kg">Kg</option>
                  </select>
                </div>
              </div>

              {/* Variant Toggles */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Item Attributes & Variant Configurations
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.has_size}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setFormData({
                          ...formData,
                          has_size: checked,
                          allowed_sizes: checked ? formData.allowed_sizes : []
                        });
                      }}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Has Sizes (S, M, L..)</span>
                  </label>

                  <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.has_color}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setFormData({
                          ...formData,
                          has_color: checked,
                          allowed_colors: checked ? formData.allowed_colors : []
                        });
                      }}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Has Color Options</span>
                  </label>

                  <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_returnable}
                      onChange={(e) => setFormData({ ...formData, is_returnable: e.target.checked })}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Is Returnable</span>
                  </label>
                </div>

                {/* Specific Sizes Selection (When has_size is enabled) */}
                {formData.has_size && (
                  <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900/40 space-y-2.5 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-blue-950 dark:text-blue-300 flex items-center gap-1.5">
                        <span>Allowed Sizes for this Item:</span>
                        <span className="text-[11px] font-normal text-slate-500">
                          ({formData.allowed_sizes.length} selected)
                        </span>
                      </label>
                      <div className="flex items-center gap-2 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, allowed_sizes: sizes.filter(s => s.is_active).map(s => s.id) })}
                          className="text-blue-600 hover:underline font-semibold"
                        >
                          Select All
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, allowed_sizes: [] })}
                          className="text-slate-500 hover:underline"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                    {sizes.filter(s => s.is_active).length === 0 ? (
                      <p className="text-xs text-amber-600">No active sizes found. Please create sizes in the Sizes master first.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {sizes.filter(s => s.is_active).map((size) => {
                          const isSelected = formData.allowed_sizes.includes(size.id);
                          return (
                            <button
                              key={size.id}
                              type="button"
                              onClick={() => {
                                const exists = formData.allowed_sizes.includes(size.id);
                                setFormData({
                                  ...formData,
                                  allowed_sizes: exists
                                    ? formData.allowed_sizes.filter(id => id !== size.id)
                                    : [...formData.allowed_sizes, size.id]
                                });
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                                isSelected
                                  ? "bg-blue-600 text-white border-blue-600 shadow-xs scale-105"
                                  : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                              }`}
                            >
                              {size.name} {size.size_type && size.size_type !== "General" ? `(${size.size_type})` : ""}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Specific Colors Selection (When has_color is enabled) */}
                {formData.has_color && (
                  <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-900/40 space-y-2.5 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-purple-950 dark:text-purple-300 flex items-center gap-1.5">
                        <span>Allowed Colors for this Item:</span>
                        <span className="text-[11px] font-normal text-slate-500">
                          ({formData.allowed_colors.length} selected)
                        </span>
                      </label>
                      <div className="flex items-center gap-2 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, allowed_colors: colors.filter(c => c.is_active).map(c => c.id) })}
                          className="text-purple-600 hover:underline font-semibold"
                        >
                          Select All
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, allowed_colors: [] })}
                          className="text-slate-500 hover:underline"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                    {colors.filter(c => c.is_active).length === 0 ? (
                      <p className="text-xs text-amber-600">No active colors found. Please create colors in the Colors master first.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {colors.filter(c => c.is_active).map((color) => {
                          const isSelected = formData.allowed_colors.includes(color.id);
                          return (
                            <button
                              key={color.id}
                              type="button"
                              onClick={() => {
                                const exists = formData.allowed_colors.includes(color.id);
                                setFormData({
                                  ...formData,
                                  allowed_colors: exists
                                    ? formData.allowed_colors.filter(id => id !== color.id)
                                    : [...formData.allowed_colors, color.id]
                                });
                              }}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                                isSelected
                                  ? "bg-purple-600 text-white border-purple-600 shadow-xs scale-105"
                                  : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                              }`}
                            >
                              {color.hex_code && (
                                <span
                                  className="w-2.5 h-2.5 rounded-full border border-black/20"
                                  style={{ backgroundColor: color.hex_code }}
                                />
                              )}
                              <span>{color.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Stock Thresholds */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Minimum Stock Alert Level <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.minimum_stock_level}
                    onChange={(e) => setFormData({ ...formData, minimum_stock_level: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <span className="text-[10px] text-slate-400">Triggers Low Stock warning when inventory drops below this.</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Maximum Stock Capacity (Optional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 500"
                    value={formData.maximum_stock_level}
                    onChange={(e) => setFormData({ ...formData, maximum_stock_level: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description / Specification (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Notes about fabric, supplier code, or school specifications..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
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
                  {editingItem ? "Update Item" : "Save Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Stock Adjustment Modal */}
      {quickAdjustItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-[95%] sm:w-full max-w-md mx-auto overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-600" />
                Quick Stock Adjustment
              </h2>
              <button
                onClick={() => setQuickAdjustItem(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickAdjust} noValidate className="p-4 sm:p-6 space-y-4">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                <div className="text-xs text-slate-500 font-medium">Item Details:</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                  {quickAdjustItem.item_name}
                </div>
                <div className="text-xs text-slate-400 mt-0.5 flex justify-between">
                  <span>Code: {quickAdjustItem.item_code}</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    Current Stock: {quickAdjustItem.current_stock} {quickAdjustItem.unit}
                  </span>
                </div>
              </div>

              {quickAdjustItem.has_size && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Size Variant <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={quickAdjustForm.size}
                    onChange={(e) => setQuickAdjustForm({ ...quickAdjustForm, size: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="">Select size</option>
                    {(quickAdjustItem.allowed_sizes && quickAdjustItem.allowed_sizes.length > 0
                      ? sizes.filter(s => quickAdjustItem.allowed_sizes.includes(s.id))
                      : sizes.filter(s => s.is_active)
                    ).map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {quickAdjustItem.has_color && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Color Variant <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={quickAdjustForm.color}
                    onChange={(e) => setQuickAdjustForm({ ...quickAdjustForm, color: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="">Select color</option>
                    {(quickAdjustItem.allowed_colors && quickAdjustItem.allowed_colors.length > 0
                      ? colors.filter(c => quickAdjustItem.allowed_colors.includes(c.id))
                      : colors.filter(c => c.is_active)
                    ).map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Adjustment Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={quickAdjustForm.adjustment_type}
                    onChange={(e) => setQuickAdjustForm({ ...quickAdjustForm, adjustment_type: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="ADJUSTMENT_IN">Add (+ In)</option>
                    <option value="ADJUSTMENT_OUT">Deduct (- Out)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Quantity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={quickAdjustForm.quantity}
                    onChange={(e) => setQuickAdjustForm({ ...quickAdjustForm, quantity: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Reason <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Physical inventory count correction"
                  value={quickAdjustForm.reason}
                  onChange={(e) => setQuickAdjustForm({ ...quickAdjustForm, reason: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setQuickAdjustItem(null)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjustSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#5826df] hover:bg-[#4a1ec2] text-white text-sm font-semibold shadow-md shadow-indigo-500/20 active:scale-95 transition-all disabled:opacity-50"
                >
                  {adjustSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Confirm Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Delete Item Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!itemToDelete}
        title="Delete Item"
        message={
          itemToDelete ? (
            <span>
              Are you sure you want to delete item{" "}
              <strong className="text-slate-900 dark:text-white font-semibold">
                "{itemToDelete.item_name}"
              </strong>{" "}
              ({itemToDelete.item_code})? This action cannot be undone.
            </span>
          ) : null
        }
        confirmText="Delete"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleConfirmDeleteItem}
        onCancel={() => setItemToDelete(null)}
      />
    </div>
  );
}
