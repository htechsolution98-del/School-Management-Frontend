"use client";

import React, { useState, useEffect } from "react";
import {
  BadgePercent,
  Plus,
  Edit2,
  Calendar,
  Loader2,
  X,
  Coins
} from "lucide-react";
import { inventoryApi, showApiError, showSuccess } from "@/lib/inventory-client";

export default function PricingAndFeeMappingPage() {
  const [pricings, setPricings] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [feeTypes, setFeeTypes] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [yearFilter, setYearFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    item: "",
    academic_year: "",
    school_class: "",
    purchase_cost: "0.00",
    selling_price: "0.00",
    charging_type: "INCLUDED_IN_FEE",
    included_fee_type: "",
    effective_from: "",
    effective_to: "",
    is_active: true,
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchPricings();
  }, [yearFilter, typeFilter]);

  const fetchInitialData = async () => {
    try {
      const [itemsRes, yearsRes, feesRes, classRes] = await Promise.all([
        inventoryApi.get("/items/"),
        inventoryApi.get("/academic-year/").catch(() => inventoryApi.get(`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}/api/academic-year/`).catch(() => ({ data: [] }))),
        inventoryApi.get("/feetype/").catch(() => inventoryApi.get(`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}/api/feetype/`).catch(() => ({ data: [] }))),
        inventoryApi.get("/class/").catch(() => inventoryApi.get(`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}/api/class/`).catch(() => ({ data: [] }))),
      ]);

      setItems(Array.isArray(itemsRes.data) ? itemsRes.data : itemsRes.data.results || []);
      const years = Array.isArray(yearsRes.data) ? yearsRes.data : yearsRes.data.results || [];
      setAcademicYears(years);
      if (years.length > 0 && !yearFilter) {
        setYearFilter(years[0].id);
      }
      setFeeTypes(Array.isArray(feesRes.data) ? feesRes.data : feesRes.data.results || []);
      setClasses(Array.isArray(classRes.data) ? classRes.data : classRes.data.results || []);
    } catch (err) {
      console.error("Error fetching dependencies:", err);
      showApiError(err, "Failed to load pricing dependencies.");
    }
  };

  const fetchPricings = async () => {
    setLoading(true);
    try {
      let url = "/pricing/?";
      if (yearFilter) url += `academic_year=${yearFilter}&`;

      const res = await inventoryApi.get(url);
      setPricings(Array.isArray(res.data) ? res.data : res.data.results || []);
    } catch (err) {
      console.error("Error fetching pricing matrix:", err);
      showApiError(err, "Failed to load pricing records.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (itemPricing: any = null) => {
    if (itemPricing) {
      setEditingId(itemPricing.id);
      setFormData({
        item: itemPricing.item || "",
        academic_year: itemPricing.academic_year || yearFilter || "",
        school_class: itemPricing.school_class || "",
        purchase_cost: itemPricing.purchase_cost || "0.00",
        selling_price: itemPricing.selling_price || "0.00",
        charging_type: itemPricing.charging_type || "INCLUDED_IN_FEE",
        included_fee_type: itemPricing.included_fee_type || "",
        effective_from: itemPricing.effective_from || "",
        effective_to: itemPricing.effective_to || "",
        is_active: itemPricing.is_active !== false,
      });
    } else {
      setEditingId(null);
      setFormData({
        item: items.length > 0 ? items[0].id : "",
        academic_year: yearFilter || (academicYears.length > 0 ? academicYears[0].id : ""),
        school_class: "",
        purchase_cost: "0.00",
        selling_price: "0.00",
        charging_type: "INCLUDED_IN_FEE",
        included_fee_type: feeTypes.length > 0 ? feeTypes[0].id : "",
        effective_from: "",
        effective_to: "",
        is_active: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload: any = {
        item: Number(formData.item),
        academic_year: Number(formData.academic_year),
        school_class: formData.school_class ? Number(formData.school_class) : null,
        purchase_cost: formData.purchase_cost,
        selling_price: formData.charging_type === "FREE" ? "0.00" : formData.selling_price,
        charging_type: formData.charging_type,
        included_fee_type: formData.charging_type === "INCLUDED_IN_FEE" && formData.included_fee_type ? Number(formData.included_fee_type) : null,
        effective_from: formData.effective_from || null,
        effective_to: formData.effective_to || null,
        is_active: formData.is_active,
      };

      if (editingId) {
        await inventoryApi.put(`/pricing/${editingId}/`, payload);
        showSuccess("Pricing configuration updated successfully");
      } else {
        await inventoryApi.post("/pricing/", payload);
        showSuccess("Pricing configuration created successfully");
      }

      setIsModalOpen(false);
      fetchPricings();
    } catch (err: any) {
      showApiError(err, "Failed to save pricing configuration.");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredPricings = pricings.filter((p) => {
    if (typeFilter === "all") return true;
    return p.charging_type === typeFilter;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BadgePercent className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Pricing & Fee Integration Matrix
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Define Academic-Year purchase cost, student selling price, and mapped Fee Types (Included in Fees vs Separate vs Free).
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-md shadow-blue-600/20 transition-all"
        >
          <Plus className="w-4 h-4" /> Configure Item Pricing
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 font-medium">
            <Calendar className="w-4 h-4 text-blue-500" />
            Academic Year:
          </div>
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-semibold text-slate-900 dark:text-white focus:outline-none"
          >
            {academicYears.map((y) => (
              <option key={y.id} value={y.id}>{y.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="all">All Charging Types</option>
            <option value="INCLUDED_IN_FEE">Included in Fees</option>
            <option value="SEPARATE_CHARGE">Separate Student Charge</option>
            <option value="FREE">Free Items</option>
          </select>
        </div>
      </div>

      {/* Pricing Matrix Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mr-2" /> Loading pricing configurations...
          </div>
        ) : filteredPricings.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Coins className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <div className="text-base font-semibold text-slate-700 dark:text-slate-300">No Pricing Configured for this Academic Year</div>
            <p className="text-xs mt-1">Map items to fee structures or set individual selling prices above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/75 dark:bg-slate-800/50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Item Name</th>
                  <th className="py-3.5 px-4">Class Applicability</th>
                  <th className="py-3.5 px-4">Charging Policy</th>
                  <th className="py-3.5 px-4">Mapped Fee Type</th>
                  <th className="py-3.5 px-4">Purchase Cost</th>
                  <th className="py-3.5 px-4">Selling / Assigned Value</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredPricings.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                      {p.item_name}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                      {p.school_class_name || "All Classes"}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                        p.charging_type === "INCLUDED_IN_FEE"
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                          : p.charging_type === "FREE"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                      }`}>
                        {p.charging_type.replace(/_/g, " ")}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      {p.included_fee_type_name ? (
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {p.included_fee_type_name}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">N/A</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-medium">
                      ₹{Number(p.purchase_cost).toLocaleString()}
                    </td>

                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                      ₹{Number(p.selling_price).toLocaleString()}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                        p.is_active ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400" : "bg-slate-100 text-slate-500"
                      }`}>
                        {p.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleOpenModal(p)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 hover:text-blue-600 dark:text-slate-400 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Configure Pricing Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingId ? "Edit Item Pricing Configuration" : "Configure Item Pricing & Fee Mapping"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Select Item <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.item}
                    onChange={(e) => setFormData({ ...formData, item: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="">Select Item</option>
                    {items.map((it) => (
                      <option key={it.id} value={it.id}>{it.item_name} ({it.item_code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Academic Year <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.academic_year}
                    onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="">Select Year</option>
                    {academicYears.map((y) => (
                      <option key={y.id} value={y.id}>{y.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Applicable Class (Optional - Leave blank for All Classes)
                </label>
                <select
                  value={formData.school_class}
                  onChange={(e) => setFormData({ ...formData, school_class: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="">Applicable to All Classes</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.school_class}</option>
                  ))}
                </select>
              </div>

              {/* Charging Type Selector */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 space-y-3">
                <label className="block text-xs font-bold text-slate-900 dark:text-white">
                  Charging Policy / Mode <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                    formData.charging_type === "INCLUDED_IN_FEE"
                      ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold"
                      : "border-slate-200 dark:border-slate-800 text-slate-600 hover:bg-slate-100"
                  }`}>
                    <input
                      type="radio"
                      name="charging_type"
                      value="INCLUDED_IN_FEE"
                      checked={formData.charging_type === "INCLUDED_IN_FEE"}
                      onChange={(e) => setFormData({ ...formData, charging_type: e.target.value })}
                      className="hidden"
                    />
                    <span className="text-xs">Included in Fees</span>
                    <span className="text-[10px] text-slate-400 font-normal mt-0.5">Part of School Fee Type</span>
                  </label>

                  <label className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                    formData.charging_type === "SEPARATE_CHARGE"
                      ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold"
                      : "border-slate-200 dark:border-slate-800 text-slate-600 hover:bg-slate-100"
                  }`}>
                    <input
                      type="radio"
                      name="charging_type"
                      value="SEPARATE_CHARGE"
                      checked={formData.charging_type === "SEPARATE_CHARGE"}
                      onChange={(e) => setFormData({ ...formData, charging_type: e.target.value })}
                      className="hidden"
                    />
                    <span className="text-xs">Separate Charge</span>
                    <span className="text-[10px] text-slate-400 font-normal mt-0.5">Direct Student Charge</span>
                  </label>

                  <label className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                    formData.charging_type === "FREE"
                      ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold"
                      : "border-slate-200 dark:border-slate-800 text-slate-600 hover:bg-slate-100"
                  }`}>
                    <input
                      type="radio"
                      name="charging_type"
                      value="FREE"
                      checked={formData.charging_type === "FREE"}
                      onChange={(e) => setFormData({ ...formData, charging_type: e.target.value })}
                      className="hidden"
                    />
                    <span className="text-xs">Free Item</span>
                    <span className="text-[10px] text-slate-400 font-normal mt-0.5">No Charge (₹0)</span>
                  </label>
                </div>
              </div>

              {/* Fee Type Mapping (Visible when INCLUDED_IN_FEE) */}
              {formData.charging_type === "INCLUDED_IN_FEE" && (
                <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 space-y-2">
                  <label className="block text-xs font-bold text-blue-900 dark:text-blue-200">
                    Existing Fee Type Mapping <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.included_fee_type}
                    onChange={(e) => setFormData({ ...formData, included_fee_type: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="">Select Existing Fee Type</option>
                    {feeTypes.map((ft) => (
                      <option key={ft.id} value={ft.id}>{ft.name} ({ft.billing_cycle || "General"})</option>
                    ))}
                  </select>
                  <p className="text-[11px] text-blue-700 dark:text-blue-300">
                    The item value is considered covered within this Fee Structure. Inventory stock will only be deducted when physically handed over.
                  </p>
                </div>
              )}

              {/* Price Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    School Purchase Cost (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="e.g. 600.00"
                    value={formData.purchase_cost}
                    onChange={(e) => setFormData({ ...formData, purchase_cost: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <span className="text-[10px] text-slate-400">Used for inventory valuation & Profit/Loss reports.</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Student Selling / Assigned Price (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    disabled={formData.charging_type === "FREE"}
                    placeholder="e.g. 900.00"
                    value={formData.charging_type === "FREE" ? "0.00" : formData.selling_price}
                    onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-50"
                  />
                  <span className="text-[10px] text-slate-400">Internal item value or direct student charge.</span>
                </div>
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
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-md shadow-blue-600/20 transition-all disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Save Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
