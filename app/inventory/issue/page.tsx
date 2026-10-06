"use client";

import React, { useState, useEffect } from "react";
import {
  UserCheck,
  Plus,
  Users,
  Search,
  Send,
  Boxes,
  Loader2,
  X,
  ShieldAlert
} from "lucide-react";
import { inventoryApi, coreApi, showApiError, showSuccess, showWarning } from "@/lib/inventory-client";

export default function StudentItemIssuePage() {
  const [activeTab, setActiveTab] = useState<"single" | "bulk" | "entitlements">("single");
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [sizes, setSizes] = useState<any[]>([]);
  const [colors, setColors] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [entitlements, setEntitlements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Single Issue Form
  const [singleStudentSearch, setSingleStudentSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [singleItem, setSingleItem] = useState("");
  const [singleSize, setSingleSize] = useState("");
  const [singleColor, setSingleColor] = useState("");
  const [singleQty, setSingleQty] = useState(1);
  const [singleReason, setSingleReason] = useState("INITIAL_ISSUE");
  const [singleSubmitting, setSingleSubmitting] = useState(false);

  // Bulk Issue Form
  const [bulkClass, setBulkClass] = useState("");
  const [bulkDivision, setBulkDivision] = useState("");
  const [bulkItem, setBulkItem] = useState("");
  const [bulkSize, setBulkSize] = useState("");
  const [bulkColor, setBulkColor] = useState("");
  const [bulkQtyPerStudent, setBulkQtyPerStudent] = useState(1);
  const [bulkStudents, setBulkStudents] = useState<any[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  // Entitlement Generator Modal
  const [isEntitlementModalOpen, setIsEntitlementModalOpen] = useState(false);
  const [entitleYear, setEntitleYear] = useState("");
  const [entitleClass, setEntitleClass] = useState("");
  const [entitleItem, setEntitleItem] = useState("");
  const [entitleQty, setEntitleQty] = useState(1);
  const [generatingEntitlement, setGeneratingEntitlement] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (bulkClass) {
      fetchClassStudents();
    }
  }, [bulkClass, bulkDivision]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [itemsRes, classRes, sizesRes, colorsRes, yearsRes, entRes, studsRes] = await Promise.all([
        inventoryApi.get("/items/"),
        coreApi.get("/getclass/").catch(() => coreApi.get("/classes/")).catch(() => ({ data: [] })),
        inventoryApi.get("/sizes/"),
        inventoryApi.get("/colors/"),
        coreApi.get("/academic-year/").catch(() => coreApi.get("/main-academic-year/")).catch(() => ({ data: [] })),
        inventoryApi.get("/entitlements/"),
        coreApi.get("/get-student/").catch(() => ({ data: [] })),
      ]);

      const its = Array.isArray(itemsRes.data) ? itemsRes.data : itemsRes.data.results || [];
      setItems(its);
      if (its.length > 0) {
        setSingleItem(its[0].id);
        setBulkItem(its[0].id);
        setEntitleItem(its[0].id);
      }

      const cl = Array.isArray(classRes.data) ? classRes.data : classRes.data.results || [];
      setClasses(cl);
      if (cl.length > 0) {
        setBulkClass(cl[0].id);
        setEntitleClass(cl[0].id);
      }

      setSizes(Array.isArray(sizesRes.data) ? sizesRes.data : sizesRes.data.results || []);
      setColors(Array.isArray(colorsRes.data) ? colorsRes.data : colorsRes.data.results || []);
      const years = Array.isArray(yearsRes.data) ? yearsRes.data : yearsRes.data.results || [];
      setAcademicYears(years);
      if (years.length > 0) {
        setEntitleYear(years[0].id);
      }

      setEntitlements(Array.isArray(entRes.data) ? entRes.data : entRes.data.results || []);
      setStudents(Array.isArray(studsRes.data) ? studsRes.data : studsRes.data.results || []);
    } catch (err) {
      console.error("Failed to load issue data:", err);
      showApiError(err, "Failed to load student issue dependencies.");
    } finally {
      setLoading(false);
    }
  };

  const fetchClassStudents = async () => {
    try {
      let url = `/get-student/?school_class=${bulkClass}`;
      if (bulkDivision) url += `&division=${bulkDivision}`;

      const res = await coreApi.get(url);
      const list = Array.isArray(res.data) ? res.data : res.data.results || [];
      setBulkStudents(list);
      setSelectedStudentIds(list.map((s: any) => s.id));
    } catch (err) {
      console.error("Error fetching class students:", err);
    }
  };

  const selectedItemObj = items.find((it) => it.id === Number(singleItem));
  const bulkItemObj = items.find((it) => it.id === Number(bulkItem));

  const handleSingleIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) {
      showWarning("Select Student", "Please select a student to issue the item.");
      return;
    }
    setSingleSubmitting(true);
    try {
      const payload = {
        student: selectedStudent.id,
        item: Number(singleItem),
        academic_year: academicYears.length > 0 ? academicYears[0].id : 1,
        quantity: Number(singleQty),
        size: singleSize ? Number(singleSize) : null,
        color: singleColor ? Number(singleColor) : null,
        issue_reason: singleReason,
      };

      await inventoryApi.post("/issues/", payload);
      showSuccess("Item Issued", `Item successfully issued to ${selectedStudent.name || ""} ${selectedStudent.surname || ""}!`);
      setSelectedStudent(null);
      setSingleStudentSearch("");
      fetchInitialData();
    } catch (err: any) {
      showApiError(err, "Failed to issue item.");
    } finally {
      setSingleSubmitting(false);
    }
  };

  const handleBulkIssue = async () => {
    if (selectedStudentIds.length === 0) {
      showWarning("Select Students", "Please select at least one student.");
      return;
    }
    const totalReq = selectedStudentIds.length * bulkQtyPerStudent;
    const available = bulkItemObj ? bulkItemObj.current_stock : 0;

    if (available < totalReq) {
      showWarning("Insufficient Stock", `Available: ${available} units, Required: ${totalReq} units.`);
      return;
    }

    setBulkSubmitting(true);
    try {
      const payload = {
        item: Number(bulkItem),
        academic_year: academicYears.length > 0 ? academicYears[0].id : 1,
        student_ids: selectedStudentIds,
        quantity_per_student: bulkQtyPerStudent,
        size: bulkSize ? Number(bulkSize) : null,
        color: bulkColor ? Number(bulkColor) : null,
      };

      const res = await inventoryApi.post("/issues/bulk-issue/", payload);
      showSuccess("Bulk Issue Complete", res.data.message || "Bulk issue completed successfully!");
      fetchInitialData();
    } catch (err: any) {
      showApiError(err, "Bulk issue failed.");
    } finally {
      setBulkSubmitting(false);
    }
  };

  const handleGenerateEntitlements = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneratingEntitlement(true);
    try {
      const payload = {
        academic_year: Number(entitleYear),
        school_class: Number(entitleClass),
        item: Number(entitleItem),
        quantity: Number(entitleQty),
      };

      const res = await inventoryApi.post("/entitlements/generate-bulk/", payload);
      showSuccess("Entitlements Generated", res.data.message || "Entitlements generated successfully!");
      setIsEntitlementModalOpen(false);
      fetchInitialData();
    } catch (err: any) {
      showApiError(err, "Failed to generate entitlements.");
    } finally {
      setGeneratingEntitlement(false);
    }
  };

  const filteredStudentSearchList = students.filter((s) => {
    if (!singleStudentSearch) return false;
    const q = singleStudentSearch.toLowerCase();
    const fullName = `${s.name || ""} ${s.surname || ""}`.toLowerCase();
    return (
      fullName.includes(q) ||
      s.roll_no?.toString().includes(q) ||
      s.gr_no?.toString().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Student Item Issue & Entitlements
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Hand over items to individual students, process class-wise bulk distribution, and track entitlements.
          </p>
        </div>
        <button
          onClick={() => setIsEntitlementModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-md shadow-blue-600/20 transition-all"
        >
          <Plus className="w-4 h-4" /> Generate Class Entitlements
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab("single")}
          className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === "single"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          <UserCheck className="w-4 h-4" /> Individual Student Issue
        </button>

        <button
          onClick={() => setActiveTab("bulk")}
          className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === "bulk"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          <Users className="w-4 h-4" /> Bulk Class Distribution
        </button>

        <button
          onClick={() => setActiveTab("entitlements")}
          className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === "entitlements"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          <Boxes className="w-4 h-4" /> Entitlement Registry ({entitlements.length})
        </button>
      </div>

      {/* Tab 1: Single Student Issue */}
      {activeTab === "single" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Issue Article to Student
            </h2>

            {/* Student Search */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Search Student (Name, Roll No, or GR No) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Type student name or roll number..."
                  value={singleStudentSearch}
                  onChange={(e) => setSingleStudentSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Autocomplete dropdown */}
              {singleStudentSearch && !selectedStudent && (
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 shadow-lg">
                  {filteredStudentSearchList.length === 0 ? (
                    <div className="p-3 text-xs text-slate-400 text-center">No students matched.</div>
                  ) : (
                    filteredStudentSearchList.map((st) => (
                      <div
                        key={st.id}
                        onClick={() => {
                          setSelectedStudent(st);
                          setSingleStudentSearch(`${st.name || ""} ${st.surname || ""} (Roll ${st.roll_no || "N/A"})`);
                        }}
                        className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer flex items-center justify-between"
                      >
                        <div>
                          <div className="font-semibold text-sm text-slate-900 dark:text-white">
                            {st.name} {st.surname}
                          </div>
                          <div className="text-xs text-slate-400">
                            Class: {st.school_class_name || "N/A"} | Roll: {st.roll_no || "N/A"} | GR: {st.gr_no || "N/A"}
                          </div>
                        </div>
                        <span className="text-xs text-blue-600 font-semibold">Select</span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {selectedStudent && (
                <div className="p-3.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-blue-900 dark:text-blue-200">
                      {selectedStudent.name} {selectedStudent.surname}
                    </div>
                    <div className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                      Roll #{selectedStudent.roll_no || "N/A"} | GR #{selectedStudent.gr_no || "N/A"}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedStudent(null);
                      setSingleStudentSearch("");
                    }}
                    className="text-xs font-semibold text-red-600 hover:underline"
                  >
                    Change
                  </button>
                </div>
              )}
            </div>

            <form onSubmit={handleSingleIssue} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Select Item <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={singleItem}
                    onChange={(e) => setSingleItem(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                  >
                    {items.map((it) => (
                      <option key={it.id} value={it.id}>
                        {it.item_name} ({it.current_stock} in stock)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Issue Reason
                  </label>
                  <select
                    value={singleReason}
                    onChange={(e) => setSingleReason(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                  >
                    <option value="INITIAL_ISSUE">Initial Academic Issue</option>
                    <option value="REPLACEMENT">Replacement</option>
                    <option value="ADDITIONAL">Additional Quantity</option>
                    <option value="SPECIAL_CASE">Special Case</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Size Variant
                  </label>
                  <select
                    value={singleSize}
                    onChange={(e) => setSingleSize(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                  >
                    <option value="">Standard / None</option>
                    {sizes.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Color Variant
                  </label>
                  <select
                    value={singleColor}
                    onChange={(e) => setSingleColor(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                  >
                    <option value="">Standard / None</option>
                    {colors.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
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
                    value={singleQty}
                    onChange={(e) => setSingleQty(Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end">
                <button
                  type="submit"
                  disabled={singleSubmitting || !selectedStudent}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-md shadow-blue-600/20 transition-all disabled:opacity-50"
                >
                  {singleSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Confirm Issue & Deduct Stock
                </button>
              </div>
            </form>
          </div>

          {/* Live Item Info Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Boxes className="w-4 h-4 text-blue-500" />
              Item Live Availability
            </h3>

            {selectedItemObj ? (
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                  <div className="text-xs text-slate-500">Available Stock:</div>
                  <div className={`text-2xl font-bold mt-1 ${
                    selectedItemObj.current_stock < singleQty ? "text-red-600" : "text-emerald-600 dark:text-emerald-400"
                  }`}>
                    {selectedItemObj.current_stock} {selectedItemObj.unit}
                  </div>
                </div>

                <div className="text-xs space-y-1.5 text-slate-600 dark:text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Category:</span>
                    <span className="font-semibold">{selectedItemObj.category_name || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Min Alert Level:</span>
                    <span className="font-semibold">{selectedItemObj.minimum_stock_level}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Policy:</span>
                    <span className="font-semibold">{selectedItemObj.active_pricing?.charging_type?.replace(/_/g, " ") || "Separate Charge"}</span>
                  </div>
                </div>

                {selectedItemObj.current_stock < singleQty && (
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/50 text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>Insufficient inventory stock to issue {singleQty} units! Restock via purchase first.</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xs text-slate-400">Select an item above to view live inventory levels.</div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Bulk Class Issue */}
      {activeTab === "bulk" && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Bulk Class Distribution Workflow
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Pre-validates entire stock before issuing to avoid partial failures.
              </p>
            </div>

            {/* Live Stock Summary Badge */}
            {bulkItemObj && (
              <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="text-right">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Available Stock</div>
                  <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{bulkItemObj.current_stock} units</div>
                </div>
                <div className="text-right pl-3 border-l border-slate-200 dark:border-slate-800">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Selected Req</div>
                  <div className={`text-lg font-bold ${
                    (selectedStudentIds.length * bulkQtyPerStudent) > bulkItemObj.current_stock
                      ? "text-red-600"
                      : "text-blue-600"
                  }`}>
                    {selectedStudentIds.length * bulkQtyPerStudent} units
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Selector Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Select Class <span className="text-red-500">*</span>
              </label>
              <select
                value={bulkClass}
                onChange={(e) => setBulkClass(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.school_class || c.class_name || c.name || `Class ${c.id}`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Select Item <span className="text-red-500">*</span>
              </label>
              <select
                value={bulkItem}
                onChange={(e) => setBulkItem(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
              >
                {items.map((it) => (
                  <option key={it.id} value={it.id}>{it.item_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Size Variant
              </label>
              <select
                value={bulkSize}
                onChange={(e) => setBulkSize(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
              >
                <option value="">Standard / None</option>
                {sizes.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Qty / Student
              </label>
              <input
                type="number"
                min="1"
                value={bulkQtyPerStudent}
                onChange={(e) => setBulkQtyPerStudent(Number(e.target.value))}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
              />
            </div>
          </div>

          {/* Student Selection Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-600 dark:text-slate-400">
                {bulkStudents.length} Students in Selected Class ({selectedStudentIds.length} checked)
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedStudentIds(bulkStudents.map((s) => s.id))}
                  className="text-blue-600 font-semibold hover:underline"
                >
                  Select All
                </button>
                <span>|</span>
                <button
                  type="button"
                  onClick={() => setSelectedStudentIds([])}
                  className="text-slate-500 font-semibold hover:underline"
                >
                  Deselect All
                </button>
              </div>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-4 w-12 text-center">
                      <input
                        type="checkbox"
                        checked={selectedStudentIds.length === bulkStudents.length && bulkStudents.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedStudentIds(bulkStudents.map((s) => s.id));
                          else setSelectedStudentIds([]);
                        }}
                      />
                    </th>
                    <th className="py-2.5 px-4">Roll #</th>
                    <th className="py-2.5 px-4">Student Name</th>
                    <th className="py-2.5 px-4">GR Number</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {bulkStudents.map((st) => (
                    <tr
                      key={st.id}
                      onClick={() => {
                        if (selectedStudentIds.includes(st.id)) {
                          setSelectedStudentIds(selectedStudentIds.filter((id) => id !== st.id));
                        } else {
                          setSelectedStudentIds([...selectedStudentIds, st.id]);
                        }
                      }}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 cursor-pointer"
                    >
                      <td className="py-2.5 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedStudentIds.includes(st.id)}
                          onChange={() => {}}
                        />
                      </td>
                      <td className="py-2.5 px-4 font-mono">{st.roll_no || "—"}</td>
                      <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-white">
                        {st.name} {st.surname}
                      </td>
                      <td className="py-2.5 px-4 text-slate-500">{st.gr_no || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-end pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={handleBulkIssue}
              disabled={bulkSubmitting || selectedStudentIds.length === 0}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-md shadow-blue-600/20 transition-all disabled:opacity-50"
            >
              {bulkSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Issue to {selectedStudentIds.length} Selected Students
            </button>
          </div>
        </div>
      )}

      {/* Tab 3: Entitlements Registry */}
      {activeTab === "entitlements" && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          {entitlements.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Boxes className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <div className="text-base font-semibold text-slate-700 dark:text-slate-300">No Entitlements Found</div>
              <p className="text-xs mt-1">Generate entitlements by class using the button in top-right.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/75 dark:bg-slate-800/50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Student</th>
                    <th className="py-3.5 px-4">Class</th>
                    <th className="py-3.5 px-4">Entitled Item</th>
                    <th className="py-3.5 px-4">Entitled Qty</th>
                    <th className="py-3.5 px-4">Issued Qty</th>
                    <th className="py-3.5 px-4">Remaining</th>
                    <th className="py-3.5 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {entitlements.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                        {e.student_name}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                        {e.student_class}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-white">
                        {e.item_name}
                      </td>
                      <td className="py-3.5 px-4 font-bold">{e.entitled_quantity}</td>
                      <td className="py-3.5 px-4 text-emerald-600 font-bold">{e.issued_quantity}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-700 dark:text-slate-300">{e.remaining_quantity}</td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold ${
                          e.status === "FULLY_ISSUED"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                            : e.status === "PARTIALLY_ISSUED"
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                        }`}>
                          {e.status.replace(/_/g, " ")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Generate Entitlement Modal */}
      {isEntitlementModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Generate Class Entitlements</h2>
              <button onClick={() => setIsEntitlementModalOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGenerateEntitlements} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Academic Year <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={entitleYear}
                  onChange={(e) => setEntitleYear(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                >
                  {academicYears.map((y) => (
                    <option key={y.id} value={y.id}>{y.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target Class <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={entitleClass}
                  onChange={(e) => setEntitleClass(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.school_class || c.class_name || c.name || `Class ${c.id}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Item to Entitle <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={entitleItem}
                  onChange={(e) => setEntitleItem(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                >
                  {items.map((it) => (
                    <option key={it.id} value={it.id}>{it.item_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Entitled Quantity / Student
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={entitleQty}
                  onChange={(e) => setEntitleQty(Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button type="button" onClick={() => setIsEntitlementModalOpen(false)} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600">
                  Cancel
                </button>
                <button type="submit" disabled={generatingEntitlement} className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold">
                  {generatingEntitlement ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Generate for Class
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
