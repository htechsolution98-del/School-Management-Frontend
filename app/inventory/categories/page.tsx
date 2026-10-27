"use client";

import React, { useState, useEffect } from "react";
import {
  Tags,
  Plus,
  Edit2,
  Trash2,
  Tag,
  Palette,
  Maximize2,
  Loader2,
  X,
  Package,
} from "lucide-react";
import { inventoryApi, showApiError, showSuccess } from "@/lib/inventory-client";
import { toast } from "sonner";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";

export default function CategoriesAndVariantsPage() {
  const [activeTab, setActiveTab] = useState<"categories" | "sizes" | "colors">("categories");
  const [categories, setCategories] = useState<any[]>([]);
  const [sizes, setSizes] = useState<any[]>([]);
  const [colors, setColors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Delete Confirmation State
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "categories" | "sizes" | "colors";
    id: number;
    name: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Attached Items Modal State
  const [attachedModal, setAttachedModal] = useState<{
    isOpen: boolean;
    title: string;
    type: "Category" | "Size Variant" | "Color Variant";
    items: Array<{ id: number; name?: string; item_name?: string; item_code?: string }>;
  }>({
    isOpen: false,
    title: "",
    type: "Category",
    items: [],
  });

  const openAttachedModal = (
    title: string,
    type: "Category" | "Size Variant" | "Color Variant",
    itemsList: any[] = []
  ) => {
    setAttachedModal({
      isOpen: true,
      title,
      type,
      items: itemsList || [],
    });
  };

  // Form Fields
  const [catName, setCatName] = useState("");
  const [catDesc, setCatDesc] = useState("");
  const [sizeName, setSizeName] = useState("");
  const [sizeType, setSizeType] = useState("Clothing");
  const [colorName, setColorName] = useState("");
  const [colorHex, setColorHex] = useState("#1e40af");

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [catRes, sizeRes, colorRes] = await Promise.all([
        inventoryApi.get("/categories/"),
        inventoryApi.get("/sizes/"),
        inventoryApi.get("/colors/"),
      ]);

      setCategories(Array.isArray(catRes.data) ? catRes.data : catRes.data.results || []);
      setSizes(Array.isArray(sizeRes.data) ? sizeRes.data : sizeRes.data.results || []);
      setColors(Array.isArray(colorRes.data) ? colorRes.data : colorRes.data.results || []);
    } catch (err) {
      console.error("Failed to load categories/variants:", err);
      showApiError(err, "Failed to load categories and variants.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (item: any = null) => {
    setEditingId(item ? item.id : null);
    if (activeTab === "categories") {
      setCatName(item ? item.name : "");
      setCatDesc(item ? item.description || "" : "");
    } else if (activeTab === "sizes") {
      setSizeName(item ? item.name : "");
      setSizeType(item ? item.size_type || "Clothing" : "Clothing");
    } else {
      setColorName(item ? item.name : "");
      setColorHex(item ? item.hex_code || "#1e40af" : "#1e40af");
    }
    setIsModalOpen(true);
  };

  const handleDeleteClick = (type: "categories" | "sizes" | "colors", id: number, name: string) => {
    setDeleteTarget({ type, id, name });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const { type, id, name } = deleteTarget;
    const label = type === "categories" ? "category" : type === "sizes" ? "size variant" : "color variant";

    setIsDeleting(true);
    try {
      await inventoryApi.delete(`/${type}/${id}/`);
      showSuccess(`${label.charAt(0).toUpperCase() + label.slice(1)} "${name}" deleted successfully`);
      setDeleteTarget(null);
      fetchAll();
    } catch (err: any) {
      showApiError(err, `Failed to delete ${label}.`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setSubmitting(true);
    try {
      if (activeTab === "categories") {
        const payload = { name: catName.trim(), description: catDesc.trim() };
        if (editingId) {
          await inventoryApi.put(`/categories/${editingId}/`, payload);
          showSuccess("Category updated successfully");
        } else {
          await inventoryApi.post("/categories/", payload);
          showSuccess("Category created successfully");
        }
      } else if (activeTab === "sizes") {
        const payload = { name: sizeName.trim(), size_type: sizeType };
        if (editingId) {
          await inventoryApi.put(`/sizes/${editingId}/`, payload);
          showSuccess("Size variant updated successfully");
        } else {
          await inventoryApi.post("/sizes/", payload);
          showSuccess("Size variant created successfully");
        }
      } else {
        const payload = { name: colorName.trim(), hex_code: colorHex };
        if (editingId) {
          await inventoryApi.put(`/colors/${editingId}/`, payload);
          showSuccess("Color variant updated successfully");
        } else {
          await inventoryApi.post("/colors/", payload);
          showSuccess("Color variant created successfully");
        }
      }

      setIsModalOpen(false);
      fetchAll();
    } catch (err: any) {
      showApiError(err, "Failed to save record.");
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
            <Tags className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Categories & Variant Masters
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Configure item grouping categories, shoe/clothing sizes, and color palettes.
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#5826df] hover:bg-[#4a1ec2] text-white text-sm font-semibold shadow-md shadow-indigo-500/20 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          {activeTab === "categories" ? "Add Category" : activeTab === "sizes" ? "Add Size" : "Add Color"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab("categories")}
          className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === "categories"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          <Tag className="w-4 h-4" /> Item Categories ({categories.length})
        </button>

        <button
          onClick={() => setActiveTab("sizes")}
          className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === "sizes"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          <Maximize2 className="w-4 h-4" /> Size Variants ({sizes.length})
        </button>

        <button
          onClick={() => setActiveTab("colors")}
          className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === "colors"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          <Palette className="w-4 h-4" /> Color Variants ({colors.length})
        </button>
      </div>

      {/* Tab Contents */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading attributes...
          </div>
        ) : activeTab === "categories" ? (
          /* Categories Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((cat: any) => (
              <div
                key={cat.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500/40 hover:shadow-md transition-all flex items-start justify-between"
              >
                <div>
                  <div className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Tag className="w-4 h-4 text-blue-500" />
                    {cat.name}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {cat.description || "No description provided."}
                  </p>
                  <div className="mt-3 text-xs">
                    {(cat.items_count || (cat.attached_items_list && cat.attached_items_list.length) || 0) > 0 ? (
                      <button
                        type="button"
                        onClick={() => openAttachedModal(cat.name, "Category", cat.attached_items_list)}
                        className="text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer inline-flex items-center gap-1 transition-all"
                      >
                        {cat.items_count || cat.attached_items_list?.length} items attached
                      </button>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500 font-medium">
                        0 items attached
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenModal(cat)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-blue-600 transition-colors"
                    title="Edit Category"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteClick("categories", cat.id, cat.name)}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-400 hover:text-red-600 transition-colors"
                    title="Delete Category"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : activeTab === "sizes" ? (
          /* Sizes Grid */
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {sizes.map((s: any) => (
              <div
                key={s.id}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500/40 text-center flex flex-col justify-between items-center relative group min-h-[110px]"
              >
                <div className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                  {s.name}
                </div>
                <span className="text-[11px] text-slate-400 font-medium mt-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                  {s.size_type || "General"}
                </span>
                <div className="mt-2 text-xs">
                  {(s.items_count || (s.attached_items_list && s.attached_items_list.length) || 0) > 0 ? (
                    <button
                      type="button"
                      onClick={() => openAttachedModal(s.name, "Size Variant", s.attached_items_list)}
                      className="text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer"
                    >
                      {s.items_count || s.attached_items_list?.length} items attached
                    </button>
                  ) : (
                    <span className="text-slate-400 dark:text-slate-500 font-medium">
                      0 items attached
                    </span>
                  )}
                </div>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex items-center gap-1 bg-white/90 dark:bg-slate-900/90 rounded-lg p-0.5 shadow-xs transition-opacity">
                  <button
                    onClick={() => handleOpenModal(s)}
                    className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-blue-600"
                    title="Edit Size"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteClick("sizes", s.id, s.name)}
                    className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-400 hover:text-red-600"
                    title="Delete Size"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Colors Grid */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {colors.map((c: any) => (
              <div
                key={c.id}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500/40 flex items-center justify-between group"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-5 h-5 rounded-full border border-black/20 shadow-sm shrink-0"
                    style={{ backgroundColor: c.hex_code || "#1e40af" }}
                  />
                  <div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">{c.name}</div>
                    <div className="text-[10px] font-mono text-slate-400">{c.hex_code}</div>
                    <div className="mt-1 text-xs">
                      {(c.items_count || (c.attached_items_list && c.attached_items_list.length) || 0) > 0 ? (
                        <button
                          type="button"
                          onClick={() => openAttachedModal(c.name, "Color Variant", c.attached_items_list)}
                          className="text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer text-left"
                        >
                          {c.items_count || c.attached_items_list?.length} items attached
                        </button>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 font-medium">
                          0 items attached
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                  <button
                    onClick={() => handleOpenModal(c)}
                    className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-blue-600"
                    title="Edit Color"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteClick("colors", c.id, c.name)}
                    className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-400 hover:text-red-600"
                    title="Delete Color"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Attribute Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingId ? "Edit" : "Add"}{" "}
                {activeTab === "categories" ? "Category" : activeTab === "sizes" ? "Size Variant" : "Color Variant"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} noValidate className="p-6 space-y-4">
              {activeTab === "categories" ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Category Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Uniform, Footwear, Books"
                      value={catName}
                      onChange={(e) => setCatName(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Description (Optional)
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Category details..."
                      value={catDesc}
                      onChange={(e) => setCatDesc(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </>
              ) : activeTab === "sizes" ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Size Name / Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. S, M, L, XL, UK 4, UK 5, 28, 30"
                      value={sizeName}
                      onChange={(e) => setSizeName(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Size Type / Classification
                    </label>
                    <select
                      value={sizeType}
                      onChange={(e) => setSizeType(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    >
                      <option value="Clothing">Clothing (XS, S, M, L, XL)</option>
                      <option value="Footwear">Footwear (UK 1, UK 2, UK 3..)</option>
                      <option value="Waist">Waist / Belt (26, 28, 30, 32)</option>
                      <option value="General">General / Standard</option>
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Color Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Navy Blue, White, Maroon, Red"
                      value={colorName}
                      onChange={(e) => setColorName(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Color Hex Code / Picker
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={colorHex}
                        onChange={(e) => setColorHex(e.target.value)}
                        className="w-10 h-10 rounded-xl border-0 cursor-pointer p-0 bg-transparent"
                      />
                      <input
                        type="text"
                        value={colorHex}
                        onChange={(e) => setColorHex(e.target.value)}
                        className="flex-1 px-3.5 py-2 text-sm font-mono rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                      />
                    </div>
                  </div>
                </>
              )}

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
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Generic Attached Items Modal */}
      {attachedModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    Attached Items
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {attachedModal.type}: <span className="font-semibold text-slate-800 dark:text-slate-200">{attachedModal.title}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAttachedModal({ ...attachedModal, isOpen: false })}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content List */}
            <div className="p-6">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <span>Item Name ({attachedModal.items.length})</span>
                <span>Code</span>
              </div>

              {attachedModal.items.length > 0 ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/60 max-h-80 overflow-y-auto pr-1 space-y-1">
                  {attachedModal.items.map((item: any, idx: number) => (
                    <div
                      key={item.id || idx}
                      className="py-2.5 px-3 flex items-center justify-between rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-semibold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {item.name || item.item_name || "Unnamed Item"}
                        </span>
                      </div>
                      {item.item_code ? (
                        <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {item.item_code}
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400 dark:text-slate-500 text-sm">
                  No items currently attached to this {attachedModal.type.toLowerCase()}.
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 bg-slate-50/50 dark:bg-slate-800/20 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setAttachedModal({ ...attachedModal, isOpen: false })}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!deleteTarget}
        title={`Delete ${deleteTarget?.type === "categories" ? "Category" : deleteTarget?.type === "sizes" ? "Size Variant" : "Color Variant"}`}
        message={
          deleteTarget ? (
            <span>
              Are you sure you want to delete{" "}
              <strong className="text-slate-900 dark:text-white font-semibold">
                "{deleteTarget.name}"
              </strong>
              ? This action cannot be undone.
            </span>
          ) : null
        }
        confirmText="Delete"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
