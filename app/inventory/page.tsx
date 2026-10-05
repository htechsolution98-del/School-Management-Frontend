"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Boxes,
  Plus,
  Search,
  Wrench,
  Package,
  FileText,
  DollarSign,
  Send,
  Inbox,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Loader2,
  Trash2,
  Edit,
  Eye,
  ArrowDownRight,
  ArrowUpRight,
  Sparkles,
  ClipboardList,
  CreditCard,
  Shirt,
  Layers,
  ArrowRightLeft,
  Truck,
  RotateCcw,
  Sliders,
  Printer,
  X,
  UserCheck,
  Building2,
  Tag,
  Clock,
  ShieldAlert,
  ChevronRight,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  InventoryItem,
  InventoryItemVariant,
  InventoryCategory,
  InventoryWarehouse,
  InventorySupplier,
  InventoryStockBalance,
  InventoryTransaction,
  StudentInventoryIssue,
  StudentIDCard,
  InventoryBundle,
  InventoryPurchase,
  PurchaseRequest,
  InventoryReturn,
  InventoryStockAdjustment,
  InventoryDashboardSummary,
  PostTracking,
  getInventoryDashboardSummary,
  getInventoryCategories,
  createInventoryCategory,
  getInventoryWarehouses,
  createInventoryWarehouse,
  getInventoryItems,
  createInventoryItem,
  addInventoryVariant,
  getInventoryStockBalances,
  getInventoryTransactions,
  createOpeningStock,
  transferStock,
  getStudentInventoryIssues,
  issueItemsToStudent,
  getInventoryBundles,
  createInventoryBundle,
  getStudentIDCards,
  issueStudentIDCard,
  replaceStudentIDCard,
  getInventorySuppliers,
  createInventorySupplier,
  getInventoryPurchases,
  createInventoryPurchase,
  getPurchaseRequests,
  createPurchaseRequest,
  reviewPurchaseRequest,
  getInventoryStockAdjustments,
  createStockAdjustment,
  getInventoryReturns,
  createInventoryReturn,
  getPostTrackings,
  createPostTracking,
  deletePostTracking,
  getStudentsList,
} from "@/lib/inventory";

export default function InventoryDashboard() {
  const [activeTab, setActiveTab] = useState<
    | "overview"
    | "items"
    | "stock"
    | "student_issues"
    | "id_cards"
    | "procurement"
    | "adjustments"
    | "returns"
    | "post"
    | "reports"
  >("overview");

  // Main Data States
  const [summary, setSummary] = useState<InventoryDashboardSummary | null>(null);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [warehouses, setWarehouses] = useState<InventoryWarehouse[]>([]);
  const [suppliers, setSuppliers] = useState<InventorySupplier[]>([]);
  const [balances, setBalances] = useState<InventoryStockBalance[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [studentIssues, setStudentIssues] = useState<StudentInventoryIssue[]>([]);
  const [bundles, setBundles] = useState<InventoryBundle[]>([]);
  const [idCards, setIdCards] = useState<StudentIDCard[]>([]);
  const [purchases, setPurchases] = useState<InventoryPurchase[]>([]);
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>([]);
  const [adjustments, setAdjustments] = useState<InventoryStockAdjustment[]>([]);
  const [returns, setReturns] = useState<InventoryReturn[]>([]);
  const [postRecords, setPostRecords] = useState<PostTracking[]>([]);
  const [students, setStudents] = useState<any[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("ALL");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [postFilter, setPostFilter] = useState<"ALL" | "INWARD" | "OUTWARD">("ALL");

  // Toast Notification
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Modals
  const [showItemModal, setShowItemModal] = useState(false);
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [selectedItemForVariant, setSelectedItemForVariant] = useState<InventoryItem | null>(null);
  const [showOpeningStockModal, setShowOpeningStockModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showStudentIssueModal, setShowStudentIssueModal] = useState(false);
  const [showKitIssueModal, setShowKitIssueModal] = useState(false);
  const [showIDCardModal, setShowIDCardModal] = useState(false);
  const [showIDCardReplaceModal, setShowIDCardReplaceModal] = useState(false);
  const [selectedCardForReplace, setSelectedCardForReplace] = useState<StudentIDCard | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showPRModal, setShowPRModal] = useState(false);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showWarehouseModal, setShowWarehouseModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [receiptIssue, setReceiptIssue] = useState<StudentInventoryIssue | null>(null);

  // Form States
  const [itemForm, setItemForm] = useState({
    item_code: "",
    item_name: "",
    category: "",
    item_type: "STUDENT_ITEM",
    unit: "PCS",
    purchase_price: "",
    selling_price: "",
    issue_price: "",
    minimum_stock: "10",
    reorder_level: "20",
    track_size: false,
    description: "",
  });

  const [variantForm, setVariantForm] = useState({
    variant_code: "",
    size: "",
    color: "",
    gender: "UNISEX",
    purchase_price: "",
    issue_price: "",
    minimum_stock: "5",
  });

  const [openingStockForm, setOpeningStockForm] = useState({
    item: "",
    variant: "",
    warehouse: "",
    quantity: "50",
    unit_cost: "0",
    remarks: "Initial Stock Setup",
  });

  const [transferForm, setTransferForm] = useState({
    from_warehouse: "",
    to_warehouse: "",
    item: "",
    variant: "",
    quantity: "10",
    remarks: "Store replenishment",
  });

  const [studentIssueForm, setStudentIssueForm] = useState({
    student: "",
    warehouse: "",
    item: "",
    variant: "",
    quantity: "1",
    unit_price: "0",
    is_returnable: false,
    paid_amount: "0",
    payment_status: "PAID",
    remarks: "Standard Student Issue",
  });

  const [kitIssueForm, setKitIssueForm] = useState({
    student: "",
    warehouse: "",
    bundle: "",
    paid_amount: "0",
    payment_status: "PAID",
    remarks: "Complete Student Kit Distribution",
  });

  const [idCardForm, setIDCardForm] = useState({
    student: "",
    card_number: "",
    card_serial_number: "",
    expiry_date: "",
    deduct_stock: true,
    warehouse: "",
    remarks: "Annual Student ID Card Issue",
  });

  const [idCardReplaceForm, setIDCardReplaceForm] = useState({
    new_card_number: "",
    reason: "LOST",
    deduct_stock: true,
    warehouse: "",
  });

  const [purchaseForm, setPurchaseForm] = useState({
    supplier: "",
    warehouse: "",
    invoice_number: "",
    invoice_date: new Date().toISOString().split("T")[0],
    item: "",
    variant: "",
    quantity: "50",
    unit_price: "0",
    tax_amount: "0",
    discount_amount: "0",
    payment_status: "PAID",
    remarks: "Bulk Stock Restocking",
  });

  const [prForm, setPRForm] = useState({
    department: "Academic & Sports",
    priority: "MEDIUM",
    item: "",
    variant: "",
    requested_quantity: "25",
    estimated_cost: "0",
    remarks: "Semester Requirement",
  });

  const [adjForm, setAdjForm] = useState({
    warehouse: "",
    reason: "PHYSICAL_COUNT",
    item: "",
    variant: "",
    system_quantity: "0",
    physical_quantity: "0",
    remarks: "Annual Inventory Audit Discrepancy",
  });

  const [returnForm, setReturnForm] = useState({
    warehouse: "",
    return_type: "STUDENT" as "STUDENT" | "STAFF" | "SUPPLIER",
    student: "",
    item: "",
    variant: "",
    quantity: "1",
    condition: "GOOD" as "GOOD" | "DAMAGED" | "SCRAP",
    remarks: "Student item returned",
  });

  const [postForm, setPostForm] = useState({
    post_type: "INWARD" as "INWARD" | "OUTWARD",
    post_name: "",
    for_post: "",
    to_post: "",
    tracking_number: "",
    remarks: "",
    post_date: new Date().toISOString().split("T")[0],
  });

  const [supplierForm, setSupplierForm] = useState({
    name: "",
    contact_person: "",
    phone: "",
    email: "",
    address: "",
    gst_number: "",
  });

  const [warehouseForm, setWarehouseForm] = useState({
    warehouse_code: "",
    warehouse_name: "",
    location: "",
  });

  const [categoryForm, setCategoryForm] = useState({
    name: "",
    code: "",
    description: "",
  });

  const showToastMsg = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4500);
  };

  // Load all system data
  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        sumData,
        catData,
        whData,
        supData,
        itemData,
        balData,
        txnData,
        issData,
        bunData,
        idData,
        purData,
        prData,
        adjData,
        retData,
        postData,
        stuData,
      ] = await Promise.all([
        getInventoryDashboardSummary().catch(() => null),
        getInventoryCategories().catch(() => []),
        getInventoryWarehouses().catch(() => []),
        getInventorySuppliers().catch(() => []),
        getInventoryItems().catch(() => []),
        getInventoryStockBalances().catch(() => []),
        getInventoryTransactions().catch(() => []),
        getStudentInventoryIssues().catch(() => []),
        getInventoryBundles().catch(() => []),
        getStudentIDCards().catch(() => []),
        getInventoryPurchases().catch(() => []),
        getPurchaseRequests().catch(() => []),
        getInventoryStockAdjustments().catch(() => []),
        getInventoryReturns().catch(() => []),
        getPostTrackings().catch(() => []),
        getStudentsList().catch(() => []),
      ]);

      if (sumData) setSummary(sumData);
      setCategories(catData);
      setWarehouses(whData);
      setSuppliers(supData);
      setItems(itemData);
      setBalances(balData);
      setTransactions(txnData);
      setStudentIssues(issData);
      setBundles(bunData);
      setIdCards(idData);
      setPurchases(purData);
      setPurchaseRequests(prData);
      setAdjustments(adjData);
      setReturns(retData);
      setPostRecords(postData);
      setStudents(stuData);
    } catch {
      showToastMsg("error", "Error loading inventory records.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Derived filterings
  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      const matchesSearch =
        it.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        it.item_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (it.category_name && it.category_name.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = selectedCategory === "ALL" || String(it.category) === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [items, searchQuery, selectedCategory]);

  const filteredBalances = useMemo(() => {
    return balances.filter((b) => {
      const matchesSearch =
        (b.item_name && b.item_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (b.item_code && b.item_code.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (b.warehouse_name && b.warehouse_name.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesWh = selectedWarehouse === "ALL" || String(b.warehouse) === selectedWarehouse;
      const matchesLow = !lowStockOnly || Boolean(b.is_low_stock);
      return matchesSearch && matchesWh && matchesLow;
    });
  }, [balances, searchQuery, selectedWarehouse, lowStockOnly]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      return (
        t.transaction_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.item_name && t.item_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (t.transaction_type && t.transaction_type.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (t.remarks && t.remarks.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    });
  }, [transactions, searchQuery]);

  const filteredIssues = useMemo(() => {
    return studentIssues.filter((iss) => {
      return (
        iss.issue_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (iss.student_name && iss.student_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (iss.student_roll && iss.student_roll.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    });
  }, [studentIssues, searchQuery]);

  const filteredIDCards = useMemo(() => {
    return idCards.filter((c) => {
      return (
        c.card_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.student_name && c.student_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.card_serial_number && c.card_serial_number.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    });
  }, [idCards, searchQuery]);

  const filteredPurchases = useMemo(() => {
    return purchases.filter((p) => {
      return (
        p.purchase_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.supplier_name && p.supplier_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.invoice_number && p.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    });
  }, [purchases, searchQuery]);

  const filteredPosts = useMemo(() => {
    return postRecords.filter((p) => {
      const matchesType = postFilter === "ALL" || p.post_type === postFilter;
      const matchesSearch =
        p.post_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.for_post.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.to_post.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.tracking_number && p.tracking_number.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesType && matchesSearch;
    });
  }, [postRecords, postFilter, searchQuery]);

  // Handlers
  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await createInventoryItem({
        item_code: itemForm.item_code,
        item_name: itemForm.item_name,
        category: itemForm.category ? Number(itemForm.category) : undefined,
        item_type: itemForm.item_type,
        unit: itemForm.unit,
        purchase_price: Number(itemForm.purchase_price) || 0,
        selling_price: Number(itemForm.selling_price) || 0,
        issue_price: Number(itemForm.issue_price) || 0,
        minimum_stock: Number(itemForm.minimum_stock) || 10,
        reorder_level: Number(itemForm.reorder_level) || 20,
        track_size: itemForm.track_size,
        description: itemForm.description,
        is_active: true,
      });
      showToastMsg("success", "Item created in Item Master!");
      setShowItemModal(false);
      setItemForm({
        item_code: "",
        item_name: "",
        category: "",
        item_type: "STUDENT_ITEM",
        unit: "PCS",
        purchase_price: "",
        selling_price: "",
        issue_price: "",
        minimum_stock: "10",
        reorder_level: "20",
        track_size: false,
        description: "",
      });
      loadAllData();
    } catch (err: any) {
      showToastMsg("error", err.message || "Failed to create item.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemForVariant) return;
    setActionLoading(true);
    try {
      await addInventoryVariant(selectedItemForVariant.id, {
        variant_code: variantForm.variant_code,
        size: variantForm.size,
        color: variantForm.color,
        gender: variantForm.gender,
        purchase_price: Number(variantForm.purchase_price) || Number(selectedItemForVariant.purchase_price) || 0,
        issue_price: Number(variantForm.issue_price) || Number(selectedItemForVariant.issue_price) || 0,
        minimum_stock: Number(variantForm.minimum_stock) || 5,
        is_active: true,
      });
      showToastMsg("success", `Variant ${variantForm.size || variantForm.variant_code} added!`);
      setShowVariantModal(false);
      setVariantForm({
        variant_code: "",
        size: "",
        color: "",
        gender: "UNISEX",
        purchase_price: "",
        issue_price: "",
        minimum_stock: "5",
      });
      loadAllData();
    } catch (err: any) {
      showToastMsg("error", err.message || "Failed to add variant.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateOpeningStock = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await createOpeningStock({
        item: Number(openingStockForm.item),
        variant: openingStockForm.variant ? Number(openingStockForm.variant) : null,
        warehouse: Number(openingStockForm.warehouse),
        quantity: Number(openingStockForm.quantity),
        unit_cost: Number(openingStockForm.unit_cost) || 0,
        remarks: openingStockForm.remarks,
      });
      showToastMsg("success", "Opening stock entered and ledger balance updated!");
      setShowOpeningStockModal(false);
      loadAllData();
    } catch (err: any) {
      showToastMsg("error", err.message || "Failed to add opening stock.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleTransferStock = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await transferStock({
        from_warehouse: Number(transferForm.from_warehouse),
        to_warehouse: Number(transferForm.to_warehouse),
        item: Number(transferForm.item),
        variant: transferForm.variant ? Number(transferForm.variant) : null,
        quantity: Number(transferForm.quantity),
        remarks: transferForm.remarks,
      });
      showToastMsg("success", "Stock transferred between warehouses successfully!");
      setShowTransferModal(false);
      loadAllData();
    } catch (err: any) {
      showToastMsg("error", err.message || "Transfer failed.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleStudentIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const issue = await issueItemsToStudent({
        student: Number(studentIssueForm.student),
        warehouse: Number(studentIssueForm.warehouse),
        items: [
          {
            item_id: Number(studentIssueForm.item),
            variant_id: studentIssueForm.variant ? Number(studentIssueForm.variant) : null,
            quantity: Number(studentIssueForm.quantity),
            unit_price: Number(studentIssueForm.unit_price) || 0,
            is_returnable: studentIssueForm.is_returnable,
          },
        ],
        paid_amount: Number(studentIssueForm.paid_amount) || 0,
        payment_status: studentIssueForm.payment_status,
        remarks: studentIssueForm.remarks,
      });
      showToastMsg("success", `Item issued to student! Issue #${issue.issue_number}`);
      setShowStudentIssueModal(false);
      setReceiptIssue(issue);
      loadAllData();
    } catch (err: any) {
      showToastMsg("error", err.message || "Failed to issue item to student.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleKitIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const issue = await issueItemsToStudent({
        student: Number(kitIssueForm.student),
        warehouse: Number(kitIssueForm.warehouse),
        bundle_id: Number(kitIssueForm.bundle),
        paid_amount: Number(kitIssueForm.paid_amount) || 0,
        payment_status: kitIssueForm.payment_status,
        remarks: kitIssueForm.remarks,
      });
      showToastMsg("success", `Complete Kit issued to student! Issue #${issue.issue_number}`);
      setShowKitIssueModal(false);
      setReceiptIssue(issue);
      loadAllData();
    } catch (err: any) {
      showToastMsg("error", err.message || "Failed to issue kit to student.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleIssueIDCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const blankItem = items.find((it) => it.item_code.includes("IDCARD") || it.item_name.toLowerCase().includes("id card"));
      await issueStudentIDCard({
        student: Number(idCardForm.student),
        card_number: idCardForm.card_number || undefined,
        card_serial_number: idCardForm.card_serial_number,
        expiry_date: idCardForm.expiry_date || undefined,
        deduct_stock_item: idCardForm.deduct_stock && blankItem ? blankItem.id : undefined,
        warehouse: idCardForm.warehouse ? Number(idCardForm.warehouse) : undefined,
        remarks: idCardForm.remarks,
      });
      showToastMsg("success", "Student ID Card issued successfully!");
      setShowIDCardModal(false);
      loadAllData();
    } catch (err: any) {
      showToastMsg("error", err.message || "Failed to issue ID card.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReplaceIDCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCardForReplace) return;
    setActionLoading(true);
    try {
      const blankItem = items.find((it) => it.item_code.includes("IDCARD") || it.item_name.toLowerCase().includes("id card"));
      await replaceStudentIDCard(selectedCardForReplace.id, {
        new_card_number: idCardReplaceForm.new_card_number || undefined,
        reason: idCardReplaceForm.reason,
        deduct_stock_item: idCardReplaceForm.deduct_stock && blankItem ? blankItem.id : undefined,
        warehouse: idCardReplaceForm.warehouse ? Number(idCardReplaceForm.warehouse) : undefined,
      });
      showToastMsg("success", "ID Card marked as replaced & new card issued!");
      setShowIDCardReplaceModal(false);
      loadAllData();
    } catch (err: any) {
      showToastMsg("error", err.message || "Failed to process card replacement.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreatePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await createInventoryPurchase({
        supplier: purchaseForm.supplier ? Number(purchaseForm.supplier) : undefined,
        warehouse: Number(purchaseForm.warehouse),
        invoice_number: purchaseForm.invoice_number,
        invoice_date: purchaseForm.invoice_date,
        tax_amount: Number(purchaseForm.tax_amount) || 0,
        discount_amount: Number(purchaseForm.discount_amount) || 0,
        payment_status: purchaseForm.payment_status,
        remarks: purchaseForm.remarks,
        items: [
          {
            item_id: Number(purchaseForm.item),
            variant_id: purchaseForm.variant ? Number(purchaseForm.variant) : null,
            quantity: Number(purchaseForm.quantity),
            unit_price: Number(purchaseForm.unit_price) || 0,
          },
        ],
      });
      showToastMsg("success", "Purchase recorded & stock automatically received into warehouse!");
      setShowPurchaseModal(false);
      loadAllData();
    } catch (err: any) {
      showToastMsg("error", err.message || "Failed to record purchase.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreatePR = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await createPurchaseRequest({
        department: prForm.department,
        priority: prForm.priority,
        remarks: prForm.remarks,
        items: [
          {
            item_id: Number(prForm.item),
            variant_id: prForm.variant ? Number(prForm.variant) : null,
            requested_quantity: Number(prForm.requested_quantity),
            estimated_cost: Number(prForm.estimated_cost) || 0,
          },
        ],
      });
      showToastMsg("success", "Purchase Request submitted for approval!");
      setShowPRModal(false);
      loadAllData();
    } catch (err: any) {
      showToastMsg("error", err.message || "Failed to submit request.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReviewPR = async (id: number, decision: "APPROVED" | "REJECTED") => {
    try {
      await reviewPurchaseRequest(id, decision);
      showToastMsg("success", `Purchase Request ${decision.toLowerCase()}!`);
      loadAllData();
    } catch (err: any) {
      showToastMsg("error", err.message || "Review failed.");
    }
  };

  const handleCreateAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await createStockAdjustment({
        warehouse: Number(adjForm.warehouse),
        reason: adjForm.reason,
        remarks: adjForm.remarks,
        items: [
          {
            item_id: Number(adjForm.item),
            variant_id: adjForm.variant ? Number(adjForm.variant) : null,
            system_quantity: Number(adjForm.system_quantity),
            physical_quantity: Number(adjForm.physical_quantity),
          },
        ],
      });
      showToastMsg("success", "Physical stock adjustment ledger entry created!");
      setShowAdjustmentModal(false);
      loadAllData();
    } catch (err: any) {
      showToastMsg("error", err.message || "Adjustment failed.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await createInventoryReturn({
        warehouse: Number(returnForm.warehouse),
        return_type: returnForm.return_type,
        student: returnForm.student ? Number(returnForm.student) : null,
        condition: returnForm.condition,
        remarks: returnForm.remarks,
        items: [
          {
            item_id: Number(returnForm.item),
            variant_id: returnForm.variant ? Number(returnForm.variant) : null,
            quantity: Number(returnForm.quantity),
          },
        ],
      });
      showToastMsg("success", "Return processed! Reusable items restored to stock.");
      setShowReturnModal(false);
      loadAllData();
    } catch (err: any) {
      showToastMsg("error", err.message || "Return failed.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await createPostTracking(postForm);
      showToastMsg("success", "Postal delivery registered!");
      setShowPostModal(false);
      setPostForm({
        post_type: "INWARD",
        post_name: "",
        for_post: "",
        to_post: "",
        tracking_number: "",
        remarks: "",
        post_date: new Date().toISOString().split("T")[0],
      });
      loadAllData();
    } catch (err: any) {
      showToastMsg("error", err.message || "Failed to record post.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await createInventorySupplier(supplierForm);
      showToastMsg("success", "Supplier profile added!");
      setShowSupplierModal(false);
      setSupplierForm({ name: "", contact_person: "", phone: "", email: "", address: "", gst_number: "" });
      loadAllData();
    } catch (err: any) {
      showToastMsg("error", err.message || "Failed to add supplier.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await createInventoryWarehouse(warehouseForm);
      showToastMsg("success", "Warehouse location added!");
      setShowWarehouseModal(false);
      setWarehouseForm({ warehouse_code: "", warehouse_name: "", location: "" });
      loadAllData();
    } catch (err: any) {
      showToastMsg("error", err.message || "Failed to add warehouse.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const created = await createInventoryCategory(categoryForm);
      showToastMsg("success", "Category created!");
      setShowCategoryModal(false);
      setCategoryForm({ name: "", code: "", description: "" });
      if (created?.id) {
        setItemForm((prev) => ({ ...prev, category: String(created.id) }));
      }
      await loadAllData();
    } catch (err: any) {
      showToastMsg("error", err.message || "Failed to add category.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-8 font-sans text-slate-900 space-y-6">
      {/* Toast banner */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl border ${
              toast.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            {toast.type === "success" ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-rose-600" />}
            <span className="text-sm font-semibold">{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-2 text-slate-500 hover:text-slate-800">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full text-indigo-700 text-xs font-semibold">
              <Sparkles className="h-3.5 w-3.5" /> School Inventory & Asset ERP
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">
              Inventory & Stores Management
            </h1>
            <p className="text-xs md:text-sm text-slate-500">
              Physical Stock, Student Uniform Kits, ID Cards, Central Ledger, Procurement & Inward/Outward Posts
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              onClick={loadAllData}
              variant="outline"
              disabled={loading}
              className="border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs md:text-sm shadow-sm gap-1.5"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-600" : ""}`} /> Refresh
            </Button>
            <Button
              onClick={() => setShowStudentIssueModal(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs md:text-sm shadow-sm gap-1.5"
            >
              <Shirt className="w-4 h-4" /> Issue to Student
            </Button>
            <Button
              onClick={() => setShowKitIssueModal(true)}
              className="bg-violet-600 hover:bg-violet-700 text-white font-medium text-xs md:text-sm shadow-sm gap-1.5"
            >
              <Layers className="w-4 h-4" /> Issue Uniform Kit
            </Button>
            <Button
              onClick={() => setShowPurchaseModal(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs md:text-sm shadow-sm gap-1.5"
            >
              <Truck className="w-4 h-4" /> Stock IN / PO
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 border-b border-slate-200 bg-white px-2 pt-2 rounded-t-xl overflow-x-auto shadow-sm">
          {[
            { id: "overview", label: "Overview & Ledger", icon: Boxes },
            { id: "items", label: "Item Master & Variants", icon: Package },
            { id: "stock", label: "Warehouse Stock Balances", icon: Building2 },
            { id: "student_issues", label: "Student Distribution", icon: Shirt },
            { id: "id_cards", label: "Student ID Cards", icon: CreditCard },
            { id: "procurement", label: "Procurement & POs", icon: Truck },
            { id: "adjustments", label: "Stock Adjustments", icon: Sliders },
            { id: "returns", label: "Returns & Damage", icon: RotateCcw },
            { id: "post", label: "Postal Register", icon: Send },
            { id: "reports", label: "Valuation Reports", icon: FileText },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setSearchQuery("");
                }}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs md:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? "border-indigo-600 text-indigo-600 bg-indigo-50/60 rounded-t-lg"
                    : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-indigo-600" : "text-slate-400"}`} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Tab Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-28 text-slate-500 bg-white rounded-xl border border-slate-200 shadow-sm">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-3" />
          <p className="text-sm font-medium">Synchronizing inventory ledger balances...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* ==================================================== */}
          {/* TAB 1: OVERVIEW & LEDGER */}
          {/* ==================================================== */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* KPI Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs uppercase font-bold tracking-wider">Total Valuation</span>
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-xl md:text-2xl font-bold text-slate-900">
                    ₹{(summary?.overview?.total_valuation || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Across all warehouses</p>
                </div>

                <div className="bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs uppercase font-bold tracking-wider">Available Stock</span>
                    <Package className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="text-xl md:text-2xl font-bold text-indigo-600">
                    {(summary?.overview?.total_stock_units || 0).toLocaleString("en-IN")} <span className="text-xs font-normal text-slate-500">units</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{summary?.overview?.total_items || 0} unique SKUs</p>
                </div>

                <div className="bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs uppercase font-bold tracking-wider">Low / Out of Stock</span>
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="text-xl md:text-2xl font-bold text-amber-600">
                    {summary?.overview?.low_stock_count || 0} <span className="text-xs font-normal text-rose-500">({summary?.overview?.out_of_stock_count || 0} zero)</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Requires reordering</p>
                </div>

                <div className="bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs uppercase font-bold tracking-wider">Uniforms & ID Cards</span>
                    <Shirt className="w-4 h-4 text-violet-600" />
                  </div>
                  <div className="text-xl md:text-2xl font-bold text-violet-700">
                    {summary?.overview?.uniforms_distributed || 0} <span className="text-xs font-normal text-slate-500">uniforms</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{summary?.overview?.active_id_cards || 0} active ID cards</p>
                </div>
              </div>

              {/* Quick Actions Shortcuts */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">Quick Inventory Workflows</h2>
                  </div>
                  <span className="text-xs text-slate-400">Atomic ledger integrated</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
                  <Button
                    onClick={() => setShowItemModal(true)}
                    variant="outline"
                    className="border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-xs text-slate-700 justify-start gap-2 h-11"
                  >
                    <Plus className="w-4 h-4 text-indigo-600" /> New Item / SKU
                  </Button>
                  <Button
                    onClick={() => setShowOpeningStockModal(true)}
                    variant="outline"
                    className="border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-xs text-slate-700 justify-start gap-2 h-11"
                  >
                    <ArrowDownRight className="w-4 h-4 text-emerald-600" /> Opening Stock
                  </Button>
                  <Button
                    onClick={() => setShowTransferModal(true)}
                    variant="outline"
                    className="border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-xs text-slate-700 justify-start gap-2 h-11"
                  >
                    <ArrowRightLeft className="w-4 h-4 text-sky-600" /> Stock Transfer
                  </Button>
                  <Button
                    onClick={() => setShowIDCardModal(true)}
                    variant="outline"
                    className="border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-xs text-slate-700 justify-start gap-2 h-11"
                  >
                    <CreditCard className="w-4 h-4 text-amber-600" /> Issue ID Card
                  </Button>
                  <Button
                    onClick={() => setShowAdjustmentModal(true)}
                    variant="outline"
                    className="border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-xs text-slate-700 justify-start gap-2 h-11"
                  >
                    <Sliders className="w-4 h-4 text-purple-600" /> Physical Audit
                  </Button>
                  <Button
                    onClick={() => setShowReturnModal(true)}
                    variant="outline"
                    className="border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-xs text-slate-700 justify-start gap-2 h-11"
                  >
                    <RotateCcw className="w-4 h-4 text-rose-600" /> Stock Return
                  </Button>
                </div>
              </div>

              {/* Central Immutable Transaction Ledger */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-indigo-600" />
                    <h2 className="text-base font-bold text-slate-900">Central Stock Transaction Ledger</h2>
                    <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full font-semibold">Immutable Audit Trail</span>
                  </div>
                  <div className="relative max-w-xs">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <Input
                      placeholder="Search transactions..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-white border-slate-200 pl-9 text-xs h-9"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">TX Code</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4">Item / Variant</th>
                        <th className="py-3 px-4">Warehouse</th>
                        <th className="py-3 px-4 text-center">Movement</th>
                        <th className="py-3 px-4 text-right">Balance After</th>
                        <th className="py-3 px-4">Date & Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredTransactions.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-8 text-slate-400">
                            No inventory transactions recorded yet.
                          </td>
                        </tr>
                      ) : (
                        filteredTransactions.slice(0, 15).map((tx) => (
                          <tr key={tx.id} className="hover:bg-slate-50/80 transition">
                            <td className="py-3 px-4 font-mono font-semibold text-slate-800">{tx.transaction_number}</td>
                            <td className="py-3 px-4">
                              <span className="inline-block px-2.5 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                                {tx.transaction_type}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-semibold text-slate-800">{tx.item_name}</div>
                              {tx.variant_size && <div className="text-[11px] text-slate-500">Size: {tx.variant_size}</div>}
                            </td>
                            <td className="py-3 px-4 text-slate-700">{tx.warehouse_name}</td>
                            <td className="py-3 px-4 text-center">
                              <span
                                className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded text-[11px] ${
                                  tx.direction === "IN"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : "bg-rose-50 text-rose-700 border border-rose-200"
                                }`}
                              >
                                {tx.direction === "IN" ? (
                                  <>
                                    <ArrowDownRight className="w-3 h-3" /> +{tx.quantity}
                                  </>
                                ) : (
                                  <>
                                    <ArrowUpRight className="w-3 h-3" /> -{tx.quantity}
                                  </>
                                )}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">{tx.balance_after}</td>
                            <td className="py-3 px-4">
                              <div className="text-slate-800">{new Date(tx.transaction_date).toLocaleDateString()}</div>
                              <div className="text-[11px] text-slate-500 truncate max-w-xs">{tx.remarks || "—"}</div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 2: ITEM MASTER & VARIANTS */}
          {/* ==================================================== */}
          {activeTab === "items" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <Input
                      placeholder="Search items, SKU, code..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-white border-slate-200 pl-9 text-xs h-9"
                    />
                  </div>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 shadow-sm"
                  >
                    <option value="ALL">All Categories</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setShowCategoryModal(true)}
                    variant="outline"
                    className="border-slate-200 bg-white text-xs gap-1.5"
                  >
                    <Tag className="w-3.5 h-3.5" /> Add Category
                  </Button>
                  <Button
                    onClick={() => setShowItemModal(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Create Item
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredItems.map((it) => (
                  <div
                    key={it.id}
                    className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-5 shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <span className="text-[10px] font-mono uppercase bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-bold">
                            {it.item_code}
                          </span>
                          <h3 className="font-bold text-slate-900 text-base mt-1.5">{it.item_name}</h3>
                        </div>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold whitespace-nowrap">
                          {it.category_name || "General"}
                        </span>
                      </div>

                      <p className="text-xs text-slate-500 line-clamp-2 mb-3">{it.description || "No description provided."}</p>

                      <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl text-xs mb-3 border border-slate-100">
                        <div>
                          <span className="text-slate-500">Purchase Price</span>
                          <div className="font-bold text-slate-800">₹{Number(it.purchase_price).toFixed(2)}</div>
                        </div>
                        <div>
                          <span className="text-slate-500">Student Issue Rate</span>
                          <div className="font-bold text-emerald-600">₹{Number(it.issue_price || it.selling_price).toFixed(2)}</div>
                        </div>
                        <div>
                          <span className="text-slate-500">Min Alert</span>
                          <div className="font-bold text-slate-800">
                            {it.minimum_stock} {it.unit}
                          </div>
                        </div>
                        <div>
                          <span className="text-slate-500">Current Stock</span>
                          <div className="font-extrabold text-indigo-600">
                            {it.total_stock || 0} {it.unit}
                          </div>
                        </div>
                      </div>

                      {/* Variants list if applicable */}
                      {it.variants && it.variants.length > 0 && (
                        <div className="mb-3">
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Sizes / Variants:</span>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {it.variants.map((v) => (
                              <span
                                key={v.id}
                                className="text-[11px] bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-md font-mono"
                              >
                                {v.size ? `Size ${v.size}` : v.variant_code} ({v.total_stock || 0})
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-2">
                      <Button
                        onClick={() => {
                          setSelectedItemForVariant(it);
                          setShowVariantModal(true);
                        }}
                        variant="ghost"
                        size="sm"
                        className="text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 p-0 h-auto font-semibold"
                      >
                        + Add Size / Color
                      </Button>
                      <Button
                        onClick={() => {
                          setOpeningStockForm({ ...openingStockForm, item: String(it.id), unit_cost: String(it.purchase_price) });
                          setShowOpeningStockModal(true);
                        }}
                        variant="outline"
                        size="sm"
                        className="text-xs border-slate-200 bg-white hover:bg-slate-50 text-slate-700 h-7"
                      >
                        Add Stock
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 3: WAREHOUSE STOCK BALANCES */}
          {/* ==================================================== */}
          {activeTab === "stock" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <Input
                      placeholder="Search balances..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-white border-slate-200 pl-9 text-xs h-9"
                    />
                  </div>
                  <select
                    value={selectedWarehouse}
                    onChange={(e) => setSelectedWarehouse(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 shadow-sm"
                  >
                    <option value="ALL">All Warehouses</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.warehouse_name}
                      </option>
                    ))}
                  </select>
                  <Button
                    onClick={() => setLowStockOnly(!lowStockOnly)}
                    variant={lowStockOnly ? "destructive" : "outline"}
                    className="text-xs h-9 border-slate-200 gap-1.5"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" /> Low Stock Only
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setShowWarehouseModal(true)}
                    variant="outline"
                    className="border-slate-200 bg-white text-xs gap-1.5"
                  >
                    <Building2 className="w-3.5 h-3.5" /> New Warehouse
                  </Button>
                  <Button
                    onClick={() => setShowOpeningStockModal(true)}
                    variant="outline"
                    className="border-slate-200 bg-white text-xs gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Opening Stock
                  </Button>
                  <Button
                    onClick={() => setShowTransferModal(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" /> Transfer Stock
                  </Button>
                </div>
              </div>

              {/* Warehouse summary cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {warehouses.map((wh) => {
                  const whBalances = balances.filter((b) => b.warehouse === wh.id);
                  const totalUnits = whBalances.reduce((acc, b) => acc + (b.available_quantity || 0), 0);
                  const totalVal = whBalances.reduce((acc, b) => acc + (b.stock_value || 0), 0);
                  const lowCount = whBalances.filter((b) => b.is_low_stock).length;

                  return (
                    <div key={wh.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono font-bold text-indigo-700 uppercase bg-indigo-50 px-2 py-0.5 rounded">
                          {wh.warehouse_code}
                        </span>
                        {lowCount > 0 && (
                          <span className="text-[11px] bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full font-bold">
                            {lowCount} Low
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-slate-900">{wh.warehouse_name}</h3>
                      <p className="text-xs text-slate-400 truncate mb-3">{wh.location || "Main Campus"}</p>
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                        <span className="text-slate-500">Units: <strong className="text-slate-800">{totalUnits}</strong></span>
                        <span className="text-slate-500">Value: <strong className="text-emerald-600">₹{totalVal.toFixed(0)}</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Balances Data Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Item & Code</th>
                      <th className="py-3 px-4">Variant / Size</th>
                      <th className="py-3 px-4">Warehouse</th>
                      <th className="py-3 px-4 text-center">Available Stock</th>
                      <th className="py-3 px-4 text-center">Min Threshold</th>
                      <th className="py-3 px-4 text-right">Unit Price</th>
                      <th className="py-3 px-4 text-right">Total Valuation</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredBalances.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-8 text-slate-400">
                          No stock balances found for this filter.
                        </td>
                      </tr>
                    ) : (
                      filteredBalances.map((b) => (
                        <tr key={b.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{b.item_name}</div>
                            <div className="text-[11px] font-mono text-slate-500">{b.item_code}</div>
                          </td>
                          <td className="py-3 px-4">
                            {b.variant_size ? (
                              <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono text-[11px]">
                                Size: {b.variant_size}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-700">{b.warehouse_name}</td>
                          <td className="py-3 px-4 text-center font-extrabold text-sm text-slate-900">
                            {b.available_quantity} {b.unit}
                          </td>
                          <td className="py-3 px-4 text-center text-slate-500">{b.minimum_stock}</td>
                          <td className="py-3 px-4 text-right text-slate-800 font-mono">₹{Number(b.purchase_price).toFixed(2)}</td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                            ₹{(b.stock_value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {b.available_quantity <= 0 ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                OUT OF STOCK
                              </span>
                            ) : b.is_low_stock ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                LOW STOCK
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                IN STOCK
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 4: STUDENT DISTRIBUTION & UNIFORMS */}
          {/* ==================================================== */}
          {activeTab === "student_issues" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <Input
                    placeholder="Search issue # or student name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-white border-slate-200 pl-9 text-xs h-9"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setShowKitIssueModal(true)}
                    className="bg-violet-600 hover:bg-violet-700 text-white text-xs gap-1.5"
                  >
                    <Layers className="w-3.5 h-3.5" /> Issue Uniform Kit
                  </Button>
                  <Button
                    onClick={() => setShowStudentIssueModal(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Single Item Issue
                  </Button>
                </div>
              </div>

              {/* Uniform Kits Available */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
                <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Predefined Student Uniform Packages</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {bundles.map((b) => (
                    <div key={b.id} className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-mono text-violet-700 font-bold uppercase">{b.bundle_code}</span>
                        <div className="font-bold text-slate-900 text-sm mt-0.5">{b.bundle_name}</div>
                        <div className="text-xs text-slate-500 mt-1">Package Price: <strong className="text-emerald-600">₹{Number(b.total_price).toFixed(2)}</strong></div>
                      </div>
                      <Button
                        onClick={() => {
                          setKitIssueForm({ ...kitIssueForm, bundle: String(b.id) });
                          setShowKitIssueModal(true);
                        }}
                        size="sm"
                        className="bg-violet-600 hover:bg-violet-700 text-white text-xs"
                      >
                        Issue
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Issues History Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Issue #</th>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Items Issued</th>
                      <th className="py-3 px-4">Store Location</th>
                      <th className="py-3 px-4 text-right">Total Amount</th>
                      <th className="py-3 px-4 text-center">Payment</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4 text-center">Slip</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredIssues.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-8 text-slate-400">
                          No student distribution records found.
                        </td>
                      </tr>
                    ) : (
                      filteredIssues.map((iss) => (
                        <tr key={iss.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4 font-mono font-semibold text-slate-800">{iss.issue_number}</td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{iss.student_name}</div>
                            <div className="text-[11px] text-slate-500">
                              {iss.student_class} {iss.student_roll ? `• Roll: ${iss.student_roll}` : ""}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1">
                              {iss.items?.map((it, idx) => (
                                <span key={idx} className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px]">
                                  {it.item_name} ({it.quantity}) {it.variant_size ? `Size: ${it.variant_size}` : ""}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-700">{iss.warehouse_name}</td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                            ₹{Number(iss.total_amount).toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                iss.payment_status === "PAID"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-amber-50 text-amber-700 border border-amber-200"
                              }`}
                            >
                              {iss.payment_status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-500">{new Date(iss.issue_date).toLocaleDateString()}</td>
                          <td className="py-3 px-4 text-center">
                            <Button
                              onClick={() => setReceiptIssue(iss)}
                              variant="ghost"
                              size="sm"
                              className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 h-7 text-xs"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 5: STUDENT ID CARDS */}
          {/* ==================================================== */}
          {activeTab === "id_cards" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <Input
                    placeholder="Search student or card number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-white border-slate-200 pl-9 text-xs h-9"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setShowIDCardModal(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5"
                  >
                    <CreditCard className="w-3.5 h-3.5" /> Issue New ID Card
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Card Number</th>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Serial / Barcode</th>
                      <th className="py-3 px-4">Issue Date</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4">Previous Card Ref</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredIDCards.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-slate-400">
                          No ID Card records found.
                        </td>
                      </tr>
                    ) : (
                      filteredIDCards.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">{c.card_number}</td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{c.student_name}</div>
                            <div className="text-[11px] text-slate-500">{c.student_class}</div>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-500">{c.card_serial_number || "—"}</td>
                          <td className="py-3 px-4 text-slate-500">{new Date(c.issue_date).toLocaleDateString()}</td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                c.issue_status === "ACTIVE"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : c.issue_status === "LOST"
                                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {c.issue_status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-500 font-mono">{c.previous_card_number || "—"}</td>
                          <td className="py-3 px-4 text-right">
                            {c.issue_status === "ACTIVE" && (
                              <Button
                                onClick={() => {
                                  setSelectedCardForReplace(c);
                                  setShowIDCardReplaceModal(true);
                                }}
                                size="sm"
                                variant="outline"
                                className="border-rose-200 hover:bg-rose-50 text-rose-700 text-xs h-7 gap-1"
                              >
                                <ShieldAlert className="w-3 h-3" /> Report Lost / Replace
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 6: PROCUREMENT & PURCHASE ORDERS */}
          {/* ==================================================== */}
          {activeTab === "procurement" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <Input
                    placeholder="Search PO number, supplier..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-white border-slate-200 pl-9 text-xs h-9"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setShowSupplierModal(true)}
                    variant="outline"
                    className="border-slate-200 bg-white text-xs gap-1.5"
                  >
                    <Building2 className="w-3.5 h-3.5" /> Add Supplier
                  </Button>
                  <Button
                    onClick={() => setShowPRModal(true)}
                    variant="outline"
                    className="border-slate-200 bg-white text-xs gap-1.5"
                  >
                    <ClipboardList className="w-3.5 h-3.5" /> New Requisition
                  </Button>
                  <Button
                    onClick={() => setShowPurchaseModal(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
                  >
                    <Truck className="w-3.5 h-3.5" /> Record Purchase & GRN
                  </Button>
                </div>
              </div>

              {/* Purchase Requests Pipeline */}
              {purchaseRequests.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
                  <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Requisition & Approval Pipeline</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {purchaseRequests.map((pr) => (
                      <div key={pr.id} className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-indigo-700 font-bold uppercase">{pr.request_number}</span>
                            <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded font-bold">{pr.status}</span>
                          </div>
                          <div className="font-bold text-slate-900 text-sm mt-1">{pr.department}</div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {pr.items?.map((it) => `${it.item_name} (Qty: ${it.requested_quantity})`).join(", ")}
                          </div>
                        </div>
                        {pr.status === "PENDING" && (
                          <div className="flex items-center gap-2">
                            <Button
                              onClick={() => handleReviewPR(pr.id, "APPROVED")}
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7"
                            >
                              Approve
                            </Button>
                            <Button
                              onClick={() => handleReviewPR(pr.id, "REJECTED")}
                              size="sm"
                              variant="outline"
                              className="border-rose-200 text-rose-700 hover:bg-rose-50 text-xs h-7"
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Purchase Orders Register */}
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">PO Number</th>
                      <th className="py-3 px-4">Supplier</th>
                      <th className="py-3 px-4">Invoice #</th>
                      <th className="py-3 px-4">Destination Store</th>
                      <th className="py-3 px-4 text-right">Total (₹)</th>
                      <th className="py-3 px-4 text-center">GRN Status</th>
                      <th className="py-3 px-4 text-center">Payment</th>
                      <th className="py-3 px-4">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPurchases.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-8 text-slate-400">
                          No purchase orders recorded yet.
                        </td>
                      </tr>
                    ) : (
                      filteredPurchases.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">{p.purchase_number}</td>
                          <td className="py-3 px-4 font-semibold text-slate-900">{p.supplier_name || "Direct Supplier"}</td>
                          <td className="py-3 px-4 font-mono text-slate-500">{p.invoice_number || "—"}</td>
                          <td className="py-3 px-4 text-slate-700">{p.warehouse_name}</td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                            ₹{Number(p.total_amount).toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {p.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                p.payment_status === "PAID"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-amber-50 text-amber-700 border border-amber-200"
                              }`}
                            >
                              {p.payment_status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-500">{new Date(p.purchase_date).toLocaleDateString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 7: STOCK ADJUSTMENTS & AUDIT */}
          {/* ==================================================== */}
          {activeTab === "adjustments" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Physical Count Stock Adjustments</h2>
                  <p className="text-xs text-slate-500">Audit discrepancy ledger with reason logs & atomic balance correction</p>
                </div>

                <Button
                  onClick={() => setShowAdjustmentModal(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Record Count Adjustment
                </Button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Adjustment #</th>
                      <th className="py-3 px-4">Warehouse</th>
                      <th className="py-3 px-4">Reason</th>
                      <th className="py-3 px-4">Adjusted Items & Variances</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {adjustments.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-slate-400">
                          No stock adjustments recorded.
                        </td>
                      </tr>
                    ) : (
                      adjustments.map((adj) => (
                        <tr key={adj.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">{adj.adjustment_number}</td>
                          <td className="py-3 px-4 text-slate-700">{adj.warehouse_name}</td>
                          <td className="py-3 px-4">
                            <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              {adj.reason}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1">
                              {adj.items?.map((it, idx) => (
                                <span
                                  key={idx}
                                  className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                                    it.difference_quantity > 0
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                      : "bg-rose-50 text-rose-700 border border-rose-200"
                                  }`}
                                >
                                  {it.item_name}: {it.difference_quantity > 0 ? `+${it.difference_quantity}` : it.difference_quantity}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-500">{new Date(adj.adjustment_date).toLocaleDateString()}</td>
                          <td className="py-3 px-4 text-slate-500">{adj.remarks || "—"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 8: RETURNS & DAMAGE */}
          {/* ==================================================== */}
          {activeTab === "returns" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Stock Return & Damage Intake</h2>
                  <p className="text-xs text-slate-500">Inspect returned items: Good condition restocks (+1), Damaged routes to scrap</p>
                </div>

                <Button
                  onClick={() => setShowReturnModal(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Process Item Return
                </Button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Return #</th>
                      <th className="py-3 px-4">Type & Source</th>
                      <th className="py-3 px-4">Items Returned</th>
                      <th className="py-3 px-4">Condition</th>
                      <th className="py-3 px-4 text-center">Restocked to Inventory?</th>
                      <th className="py-3 px-4">Date & Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {returns.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-slate-400">
                          No returns recorded yet.
                        </td>
                      </tr>
                    ) : (
                      returns.map((ret) => (
                        <tr key={ret.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">{ret.return_number}</td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-900">{ret.return_type}</span>
                            <div className="text-[11px] text-slate-500">{ret.student_name || ret.staff_name || "—"}</div>
                          </td>
                          <td className="py-3 px-4">
                            {ret.items?.map((it, idx) => (
                              <div key={idx} className="text-slate-800">
                                {it.item_name} (Qty: {it.quantity})
                              </div>
                            ))}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2.5 py-0.5 rounded text-[11px] font-bold ${
                                ret.condition === "GOOD"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-rose-50 text-rose-700 border border-rose-200"
                              }`}
                            >
                              {ret.condition}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {ret.is_restocked ? (
                              <span className="text-emerald-600 font-bold">YES (+IN)</span>
                            ) : (
                              <span className="text-rose-600 font-bold">NO (DAMAGED)</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-slate-800">{new Date(ret.return_date).toLocaleDateString()}</div>
                            <div className="text-[11px] text-slate-500">{ret.remarks || "—"}</div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 9: INWARD & OUTWARD POST TRACKING */}
          {/* ==================================================== */}
          {activeTab === "post" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <Input
                      placeholder="Search post or tracking..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-white border-slate-200 pl-9 text-xs h-9"
                    />
                  </div>
                  <div className="flex bg-white border border-slate-200 rounded-lg p-0.5 text-xs shadow-sm">
                    {(["ALL", "INWARD", "OUTWARD"] as const).map((dir) => (
                      <button
                        key={dir}
                        onClick={() => setPostFilter(dir)}
                        className={`px-3 py-1 rounded-md font-semibold transition ${
                          postFilter === dir ? "bg-indigo-600 text-white" : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        {dir}
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={() => setShowPostModal(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Record Delivery / Dispatch
                </Button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Direction</th>
                      <th className="py-3 px-4">Article / Description</th>
                      <th className="py-3 px-4">Sender (From)</th>
                      <th className="py-3 px-4">Receiver (To)</th>
                      <th className="py-3 px-4">Tracking #</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Remarks</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPosts.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-8 text-slate-400">
                          No postal entries found.
                        </td>
                      </tr>
                    ) : (
                      filteredPosts.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                p.post_type === "INWARD"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-sky-50 text-sky-700 border border-sky-200"
                              }`}
                            >
                              {p.post_type}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900">{p.post_name}</td>
                          <td className="py-3 px-4 text-slate-700">{p.for_post || "—"}</td>
                          <td className="py-3 px-4 text-slate-700">{p.to_post || "—"}</td>
                          <td className="py-3 px-4 font-mono text-slate-500">{p.tracking_number || "—"}</td>
                          <td className="py-3 px-4 text-slate-500">{new Date(p.post_date).toLocaleDateString()}</td>
                          <td className="py-3 px-4 text-slate-500">{p.remarks || "—"}</td>
                          <td className="py-3 px-4 text-right">
                            <Button
                              onClick={async () => {
                                if (confirm("Delete this postal entry?")) {
                                  await deletePostTracking(p.id);
                                  showToastMsg("success", "Post record deleted");
                                  loadAllData();
                                }
                              }}
                              variant="ghost"
                              size="sm"
                              className="text-slate-400 hover:text-rose-600 h-7"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 10: VALUATION & AUDIT REPORTS */}
          {/* ==================================================== */}
          {activeTab === "reports" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Stock Valuation & Category Breakdown</h2>
                  <p className="text-xs text-slate-500">Real-time asset valuation reports for audit and administrative review</p>
                </div>
                <Button onClick={() => window.print()} variant="outline" className="text-xs border-slate-200 bg-white gap-1.5 shadow-sm">
                  <Printer className="w-3.5 h-3.5" /> Print Report
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
                  <h3 className="text-sm font-bold text-slate-900">Category-wise Item Distribution</h3>
                  <div className="space-y-2.5">
                    {summary?.category_breakdown?.map((cat, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="font-semibold text-slate-800">{cat.name}</span>
                        <span className="font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">{cat.count} SKUs</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
                  <h3 className="text-sm font-bold text-slate-900">Critical Low Stock Reorder List</h3>
                  <div className="space-y-2.5">
                    {balances
                      .filter((b) => b.is_low_stock)
                      .slice(0, 8)
                      .map((b) => (
                        <div key={b.id} className="flex items-center justify-between text-xs p-3 bg-rose-50 border border-rose-100 rounded-xl">
                          <div>
                            <div className="font-bold text-slate-900">{b.item_name}</div>
                            <div className="text-[11px] text-slate-500">{b.warehouse_name} {b.variant_size ? `• Size: ${b.variant_size}` : ""}</div>
                          </div>
                          <div className="text-right">
                            <span className="text-rose-700 font-extrabold">{b.available_quantity} available</span>
                            <div className="text-[10px] text-slate-500">Min: {b.minimum_stock}</div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* MODALS */}
      {/* ==================================================== */}

      {/* 1. Item Master Modal */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-slate-900">Add Item to Item Master</h3>
              <button onClick={() => setShowItemModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateItem} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-slate-700 font-semibold">Item Code / SKU *</Label>
                  <Input
                    required
                    value={itemForm.item_code}
                    onChange={(e) => setItemForm({ ...itemForm, item_code: e.target.value.toUpperCase() })}
                    placeholder="e.g. UNI-SHIRT-01"
                    className="bg-white border-slate-200 text-xs mt-1 text-slate-900"
                  />
                </div>
                <div>
                  <Label className="text-slate-700 font-semibold">Unit of Measure *</Label>
                  <Input
                    required
                    value={itemForm.unit}
                    onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
                    placeholder="e.g. PCS, Pair, Box"
                    className="bg-white border-slate-200 text-xs mt-1 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <Label className="text-slate-700 font-semibold">Item Name *</Label>
                <Input
                  required
                  value={itemForm.item_name}
                  onChange={(e) => setItemForm({ ...itemForm, item_name: e.target.value })}
                  placeholder="e.g. School Uniform Shirt"
                  className="bg-white border-slate-200 text-xs mt-1 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-slate-700 font-semibold">Category</Label>
                    <button
                      type="button"
                      onClick={() => setShowCategoryModal(true)}
                      className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold hover:underline flex items-center gap-0.5"
                    >
                      + New Category
                    </button>
                  </div>
                  <select
                    value={itemForm.category}
                    onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 mt-1 shadow-sm"
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-slate-700 font-semibold">Item Type</Label>
                  <select
                    value={itemForm.item_type}
                    onChange={(e) => setItemForm({ ...itemForm, item_type: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 mt-1 shadow-sm"
                  >
                    <option value="STUDENT_ITEM">Student Item (Uniform, Shoes, ID)</option>
                    <option value="CONSUMABLE">Consumable</option>
                    <option value="ASSET">Asset (Equipment, Lab)</option>
                    <option value="STATIONERY">Stationery</option>
                    <option value="SPORTS">Sports Item</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-slate-700 font-semibold">Purchase Cost (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={itemForm.purchase_price}
                    onChange={(e) => setItemForm({ ...itemForm, purchase_price: e.target.value })}
                    placeholder="0.00"
                    className="bg-white border-slate-200 text-xs mt-1 text-slate-900"
                  />
                </div>
                <div>
                  <Label className="text-slate-700 font-semibold">Issue Price (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={itemForm.issue_price}
                    onChange={(e) => setItemForm({ ...itemForm, issue_price: e.target.value })}
                    placeholder="0.00"
                    className="bg-white border-slate-200 text-xs mt-1 text-slate-900"
                  />
                </div>
                <div>
                  <Label className="text-slate-700 font-semibold">Min Stock Alert</Label>
                  <Input
                    type="number"
                    value={itemForm.minimum_stock}
                    onChange={(e) => setItemForm({ ...itemForm, minimum_stock: e.target.value })}
                    className="bg-white border-slate-200 text-xs mt-1 text-slate-900"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="track_size"
                  checked={itemForm.track_size}
                  onChange={(e) => setItemForm({ ...itemForm, track_size: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-0"
                />
                <label htmlFor="track_size" className="text-slate-700 font-medium">
                  This item has size / color variants (e.g. Uniform sizes 28-36)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" onClick={() => setShowItemModal(false)} variant="outline" className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" disabled={actionLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
                  {actionLoading ? "Saving..." : "Create Item"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Variant Modal */}
      {showVariantModal && selectedItemForVariant && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-base text-slate-900">Add Variant</h3>
                <p className="text-xs text-indigo-700 font-semibold">{selectedItemForVariant.item_name}</p>
              </div>
              <button onClick={() => setShowVariantModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddVariant} className="space-y-4 text-xs">
              <div>
                <Label className="text-slate-700 font-semibold">Variant Code *</Label>
                <Input
                  required
                  value={variantForm.variant_code}
                  onChange={(e) => setVariantForm({ ...variantForm, variant_code: e.target.value.toUpperCase() })}
                  placeholder="e.g. SIZE-32-W"
                  className="bg-white border-slate-200 text-xs mt-1 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-slate-700 font-semibold">Size (e.g. 28, 30, 32, 6, S, M)</Label>
                  <Input
                    value={variantForm.size}
                    onChange={(e) => setVariantForm({ ...variantForm, size: e.target.value })}
                    placeholder="e.g. 32"
                    className="bg-white border-slate-200 text-xs mt-1 text-slate-900"
                  />
                </div>
                <div>
                  <Label className="text-slate-700 font-semibold">Color</Label>
                  <Input
                    value={variantForm.color}
                    onChange={(e) => setVariantForm({ ...variantForm, color: e.target.value })}
                    placeholder="e.g. White"
                    className="bg-white border-slate-200 text-xs mt-1 text-slate-900"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" onClick={() => setShowVariantModal(false)} variant="outline" className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" disabled={actionLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
                  {actionLoading ? "Saving..." : "Add Variant"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Opening Stock Modal */}
      {showOpeningStockModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-base text-slate-900">Record Opening Stock</h3>
                <p className="text-xs text-slate-500">Initial physical inventory stock setup</p>
              </div>
              <button onClick={() => setShowOpeningStockModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateOpeningStock} className="space-y-4 text-xs">
              <div>
                <Label className="text-slate-700 font-semibold">Item *</Label>
                <select
                  required
                  value={openingStockForm.item}
                  onChange={(e) => setOpeningStockForm({ ...openingStockForm, item: e.target.value, variant: "" })}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 mt-1 shadow-sm"
                >
                  <option value="">Select Item</option>
                  {items.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.item_name} ({it.item_code})
                    </option>
                  ))}
                </select>
              </div>

              {openingStockForm.item && (
                <div>
                  <Label className="text-slate-700 font-semibold">Variant / Size (Optional)</Label>
                  <select
                    value={openingStockForm.variant}
                    onChange={(e) => setOpeningStockForm({ ...openingStockForm, variant: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 mt-1 shadow-sm"
                  >
                    <option value="">Standard / Default</option>
                    {items
                      .find((it) => String(it.id) === openingStockForm.item)
                      ?.variants?.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.size ? `Size: ${v.size}` : v.variant_code} {v.color ? `(${v.color})` : ""}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div>
                <Label className="text-slate-700 font-semibold">Destination Warehouse *</Label>
                <select
                  required
                  value={openingStockForm.warehouse}
                  onChange={(e) => setOpeningStockForm({ ...openingStockForm, warehouse: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 mt-1 shadow-sm"
                >
                  <option value="">Select Warehouse</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.warehouse_name} ({w.warehouse_code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-slate-700 font-semibold">Opening Quantity *</Label>
                  <Input
                    required
                    type="number"
                    value={openingStockForm.quantity}
                    onChange={(e) => setOpeningStockForm({ ...openingStockForm, quantity: e.target.value })}
                    className="bg-white border-slate-200 text-xs mt-1 text-slate-900"
                  />
                </div>
                <div>
                  <Label className="text-slate-700 font-semibold">Unit Cost (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={openingStockForm.unit_cost}
                    onChange={(e) => setOpeningStockForm({ ...openingStockForm, unit_cost: e.target.value })}
                    className="bg-white border-slate-200 text-xs mt-1 text-slate-900"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" onClick={() => setShowOpeningStockModal(false)} variant="outline" className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" disabled={actionLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
                  {actionLoading ? "Processing..." : "Confirm Stock IN (+)"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Single Student Issue Modal */}
      {showStudentIssueModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-base text-slate-900">Issue Item to Student</h3>
                <p className="text-xs text-slate-500">Deducts physical stock & logs issue receipt</p>
              </div>
              <button onClick={() => setShowStudentIssueModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleStudentIssue} className="space-y-4 text-xs">
              <div>
                <Label className="text-slate-700 font-semibold">Select Student *</Label>
                <select
                  required
                  value={studentIssueForm.student}
                  onChange={(e) => setStudentIssueForm({ ...studentIssueForm, student: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 mt-1 shadow-sm"
                >
                  <option value="">Choose Student</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.student_class} {s.roll_number ? `• Roll ${s.roll_number}` : ""})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-slate-700 font-semibold">Store / Warehouse *</Label>
                <select
                  required
                  value={studentIssueForm.warehouse}
                  onChange={(e) => setStudentIssueForm({ ...studentIssueForm, warehouse: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 mt-1 shadow-sm"
                >
                  <option value="">Select Warehouse</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.warehouse_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-slate-700 font-semibold">Item to Issue *</Label>
                <select
                  required
                  value={studentIssueForm.item}
                  onChange={(e) => {
                    const selItem = items.find((it) => String(it.id) === e.target.value);
                    setStudentIssueForm({
                      ...studentIssueForm,
                      item: e.target.value,
                      variant: "",
                      unit_price: String(selItem?.issue_price || selItem?.selling_price || 0),
                    });
                  }}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 mt-1 shadow-sm"
                >
                  <option value="">Select Item</option>
                  {items.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.item_name} ({it.item_code})
                    </option>
                  ))}
                </select>
              </div>

              {studentIssueForm.item && (
                <div>
                  <Label className="text-slate-700 font-semibold">Size / Variant</Label>
                  <select
                    value={studentIssueForm.variant}
                    onChange={(e) => setStudentIssueForm({ ...studentIssueForm, variant: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 mt-1 shadow-sm"
                  >
                    <option value="">Default Variant</option>
                    {items
                      .find((it) => String(it.id) === studentIssueForm.item)
                      ?.variants?.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.size ? `Size ${v.size}` : v.variant_code} (Avail: {v.total_stock || 0})
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-slate-700 font-semibold">Quantity</Label>
                  <Input
                    required
                    type="number"
                    value={studentIssueForm.quantity}
                    onChange={(e) => setStudentIssueForm({ ...studentIssueForm, quantity: e.target.value })}
                    className="bg-white border-slate-200 text-xs mt-1 text-slate-900"
                  />
                </div>
                <div>
                  <Label className="text-slate-700 font-semibold">Unit Price (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={studentIssueForm.unit_price}
                    onChange={(e) => setStudentIssueForm({ ...studentIssueForm, unit_price: e.target.value })}
                    className="bg-white border-slate-200 text-xs mt-1 text-slate-900"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" onClick={() => setShowStudentIssueModal(false)} variant="outline" className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" disabled={actionLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
                  {actionLoading ? "Processing..." : "Confirm Issue & Stock OUT"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Uniform Kit / Bundle Issue Modal */}
      {showKitIssueModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-base text-slate-900">Issue Student Uniform Kit</h3>
                <p className="text-xs text-violet-700 font-semibold">1-click automated bundle item stock deduction</p>
              </div>
              <button onClick={() => setShowKitIssueModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleKitIssue} className="space-y-4 text-xs">
              <div>
                <Label className="text-slate-700 font-semibold">Select Student *</Label>
                <select
                  required
                  value={kitIssueForm.student}
                  onChange={(e) => setKitIssueForm({ ...kitIssueForm, student: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 mt-1 shadow-sm"
                >
                  <option value="">Choose Student</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.student_class})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-slate-700 font-semibold">Uniform Kit Bundle *</Label>
                <select
                  required
                  value={kitIssueForm.bundle}
                  onChange={(e) => {
                    const b = bundles.find((bun) => String(bun.id) === e.target.value);
                    setKitIssueForm({
                      ...kitIssueForm,
                      bundle: e.target.value,
                      paid_amount: String(b?.total_price || 0),
                    });
                  }}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 mt-1 shadow-sm"
                >
                  <option value="">Choose Kit</option>
                  {bundles.map((bun) => (
                    <option key={bun.id} value={bun.id}>
                      {bun.bundle_name} (₹{Number(bun.total_price).toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-slate-700 font-semibold">Fulfilling Warehouse *</Label>
                <select
                  required
                  value={kitIssueForm.warehouse}
                  onChange={(e) => setKitIssueForm({ ...kitIssueForm, warehouse: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 mt-1 shadow-sm"
                >
                  <option value="">Select Warehouse</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.warehouse_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" onClick={() => setShowKitIssueModal(false)} variant="outline" className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" disabled={actionLoading} className="bg-violet-600 hover:bg-violet-700 text-white text-xs">
                  {actionLoading ? "Issuing..." : "Confirm Kit Issue"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Issue ID Card Modal */}
      {showIDCardModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-base text-slate-900">Issue Student ID Card</h3>
                <p className="text-xs text-slate-500">Generate ID card & deduct blank PVC card from stock</p>
              </div>
              <button onClick={() => setShowIDCardModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleIssueIDCard} className="space-y-4 text-xs">
              <div>
                <Label className="text-slate-700 font-semibold">Student *</Label>
                <select
                  required
                  value={idCardForm.student}
                  onChange={(e) => setIDCardForm({ ...idCardForm, student: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 mt-1 shadow-sm"
                >
                  <option value="">Select Student</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.student_class})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-slate-700 font-semibold">Card Number (Optional - Auto-generated if blank)</Label>
                <Input
                  value={idCardForm.card_number}
                  onChange={(e) => setIDCardForm({ ...idCardForm, card_number: e.target.value })}
                  placeholder="e.g. ID-2026-0042"
                  className="bg-white border-slate-200 text-xs mt-1 text-slate-900"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="deduct_id"
                  checked={idCardForm.deduct_stock}
                  onChange={(e) => setIDCardForm({ ...idCardForm, deduct_stock: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-0"
                />
                <label htmlFor="deduct_id" className="text-slate-700 font-medium">
                  Automatically deduct 1 blank PVC ID Card from Inventory stock
                </label>
              </div>

              {idCardForm.deduct_stock && (
                <div>
                  <Label className="text-slate-700 font-semibold">Deduct from Warehouse</Label>
                  <select
                    value={idCardForm.warehouse}
                    onChange={(e) => setIDCardForm({ ...idCardForm, warehouse: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 mt-1 shadow-sm"
                  >
                    <option value="">Select Warehouse</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.warehouse_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" onClick={() => setShowIDCardModal(false)} variant="outline" className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" disabled={actionLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
                  {actionLoading ? "Issuing..." : "Confirm ID Card"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Replace ID Card Modal */}
      {showIDCardReplaceModal && selectedCardForReplace && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-base text-rose-700">Replace Lost / Damaged ID Card</h3>
                <p className="text-xs text-slate-500">Void previous card & issue new replacement</p>
              </div>
              <button onClick={() => setShowIDCardReplaceModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleReplaceIDCard} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <span className="text-slate-500">Current Card:</span>
                <div className="font-mono font-bold text-slate-900 mt-0.5">
                  #{selectedCardForReplace.card_number} — {selectedCardForReplace.student_name}
                </div>
              </div>

              <div>
                <Label className="text-slate-700 font-semibold">Reason for Replacement *</Label>
                <select
                  value={idCardReplaceForm.reason}
                  onChange={(e) => setIDCardReplaceForm({ ...idCardReplaceForm, reason: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 mt-1 shadow-sm"
                >
                  <option value="LOST">Card Lost / Misplaced</option>
                  <option value="DAMAGED">Card Physically Damaged</option>
                  <option value="REPLACED">Standard Update / Replaced</option>
                </select>
              </div>

              <div>
                <Label className="text-slate-700 font-semibold">New Card Number (Optional - Auto-generated if blank)</Label>
                <Input
                  value={idCardReplaceForm.new_card_number}
                  onChange={(e) => setIDCardReplaceForm({ ...idCardReplaceForm, new_card_number: e.target.value })}
                  placeholder={`e.g. ${selectedCardForReplace.card_number}-R1`}
                  className="bg-white border-slate-200 text-xs mt-1 text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" onClick={() => setShowIDCardReplaceModal(false)} variant="outline" className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" disabled={actionLoading} className="bg-rose-600 hover:bg-rose-700 text-white text-xs">
                  {actionLoading ? "Processing..." : "Confirm Replacement"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. Purchase / Restock Modal */}
      {showPurchaseModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-base text-slate-900">Record Purchase & Receive Goods (GRN)</h3>
                <p className="text-xs text-emerald-700 font-semibold">Automatically adds stock into chosen warehouse</p>
              </div>
              <button onClick={() => setShowPurchaseModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreatePurchase} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-slate-700 font-semibold">Supplier</Label>
                  <select
                    value={purchaseForm.supplier}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, supplier: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 mt-1 shadow-sm"
                  >
                    <option value="">Direct / Walk-in</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-slate-700 font-semibold">Receiving Warehouse *</Label>
                  <select
                    required
                    value={purchaseForm.warehouse}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, warehouse: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 mt-1 shadow-sm"
                  >
                    <option value="">Select Warehouse</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.warehouse_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <Label className="text-slate-700 font-semibold">Item Purchased *</Label>
                <select
                  required
                  value={purchaseForm.item}
                  onChange={(e) => {
                    const selItem = items.find((it) => String(it.id) === e.target.value);
                    setPurchaseForm({
                      ...purchaseForm,
                      item: e.target.value,
                      variant: "",
                      unit_price: String(selItem?.purchase_price || 0),
                    });
                  }}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 mt-1 shadow-sm"
                >
                  <option value="">Select Item</option>
                  {items.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.item_name} ({it.item_code})
                    </option>
                  ))}
                </select>
              </div>

              {purchaseForm.item && (
                <div>
                  <Label className="text-slate-700 font-semibold">Variant / Size (Optional)</Label>
                  <select
                    value={purchaseForm.variant}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, variant: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 mt-1 shadow-sm"
                  >
                    <option value="">Default Variant</option>
                    {items
                      .find((it) => String(it.id) === purchaseForm.item)
                      ?.variants?.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.size ? `Size ${v.size}` : v.variant_code}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-slate-700 font-semibold">Quantity *</Label>
                  <Input
                    required
                    type="number"
                    value={purchaseForm.quantity}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, quantity: e.target.value })}
                    className="bg-white border-slate-200 text-xs mt-1 text-slate-900"
                  />
                </div>
                <div>
                  <Label className="text-slate-700 font-semibold">Unit Cost (₹) *</Label>
                  <Input
                    required
                    type="number"
                    step="0.01"
                    value={purchaseForm.unit_price}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, unit_price: e.target.value })}
                    className="bg-white border-slate-200 text-xs mt-1 text-slate-900"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" onClick={() => setShowPurchaseModal(false)} variant="outline" className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" disabled={actionLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
                  {actionLoading ? "Receiving..." : "Confirm & Restock Stock (+)"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. Stock Adjustment Modal */}
      {showAdjustmentModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-base text-slate-900">Physical Count Stock Adjustment</h3>
                <p className="text-xs text-slate-500">Reconcile physical inventory count against system ledger</p>
              </div>
              <button onClick={() => setShowAdjustmentModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateAdjustment} className="space-y-4 text-xs">
              <div>
                <Label className="text-slate-700 font-semibold">Warehouse *</Label>
                <select
                  required
                  value={adjForm.warehouse}
                  onChange={(e) => setAdjForm({ ...adjForm, warehouse: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 mt-1 shadow-sm"
                >
                  <option value="">Select Warehouse</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.warehouse_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-slate-700 font-semibold">Item *</Label>
                <select
                  required
                  value={adjForm.item}
                  onChange={(e) => {
                    const selBal = balances.find(
                      (b) => String(b.item) === e.target.value && (!adjForm.warehouse || String(b.warehouse) === adjForm.warehouse)
                    );
                    setAdjForm({
                      ...adjForm,
                      item: e.target.value,
                      system_quantity: String(selBal?.available_quantity || 0),
                    });
                  }}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 mt-1 shadow-sm"
                >
                  <option value="">Select Item</option>
                  {items.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.item_name} ({it.item_code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-slate-700 font-semibold">Reason for Adjustment *</Label>
                <select
                  value={adjForm.reason}
                  onChange={(e) => setAdjForm({ ...adjForm, reason: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 mt-1 shadow-sm"
                >
                  <option value="PHYSICAL_COUNT">Physical Count Audit Discrepancy</option>
                  <option value="DAMAGED">Damaged Goods Write-off</option>
                  <option value="LOST">Lost / Missing Stock</option>
                  <option value="THEFT">Theft / Unaccounted Loss</option>
                  <option value="EXPIRED">Expired Supplies</option>
                  <option value="DATA_CORRECTION">Data Entry Correction</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-slate-700 font-semibold">System Count</Label>
                  <Input
                    readOnly
                    value={adjForm.system_quantity}
                    className="bg-slate-50 border-slate-200 text-xs text-slate-500 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-slate-700 font-semibold">Actual Physical Count *</Label>
                  <Input
                    required
                    type="number"
                    value={adjForm.physical_quantity}
                    onChange={(e) => setAdjForm({ ...adjForm, physical_quantity: e.target.value })}
                    className="bg-white border-slate-200 text-xs mt-1 text-slate-900"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" onClick={() => setShowAdjustmentModal(false)} variant="outline" className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" disabled={actionLoading} className="bg-purple-600 hover:bg-purple-700 text-white text-xs">
                  {actionLoading ? "Adjusting..." : "Confirm Adjustment"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 10. Stock Return Modal */}
      {showReturnModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-base text-slate-900">Process Stock Return</h3>
                <p className="text-xs text-slate-500">Intake returned items from student or staff</p>
              </div>
              <button onClick={() => setShowReturnModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateReturn} className="space-y-4 text-xs">
              <div>
                <Label className="text-slate-700 font-semibold">Receiving Store *</Label>
                <select
                  required
                  value={returnForm.warehouse}
                  onChange={(e) => setReturnForm({ ...returnForm, warehouse: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 mt-1 shadow-sm"
                >
                  <option value="">Select Warehouse</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.warehouse_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-slate-700 font-semibold">Item Returned *</Label>
                <select
                  required
                  value={returnForm.item}
                  onChange={(e) => setReturnForm({ ...returnForm, item: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 mt-1 shadow-sm"
                >
                  <option value="">Select Item</option>
                  {items.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.item_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-slate-700 font-semibold">Quantity</Label>
                  <Input
                    required
                    type="number"
                    value={returnForm.quantity}
                    onChange={(e) => setReturnForm({ ...returnForm, quantity: e.target.value })}
                    className="bg-white border-slate-200 text-xs mt-1 text-slate-900"
                  />
                </div>
                <div>
                  <Label className="text-slate-700 font-semibold">Condition Inspection *</Label>
                  <select
                    value={returnForm.condition}
                    onChange={(e) => setReturnForm({ ...returnForm, condition: e.target.value as any })}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 mt-1 shadow-sm"
                  >
                    <option value="GOOD">Good / Reusable (+IN to stock)</option>
                    <option value="DAMAGED">Damaged / Not Restocked</option>
                    <option value="SCRAP">Scrap / Discarded</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" onClick={() => setShowReturnModal(false)} variant="outline" className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" disabled={actionLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
                  {actionLoading ? "Processing..." : "Confirm Return"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 11. Postal Entry Modal */}
      {showPostModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-base text-slate-900">Record Postal / Courier Record</h3>
                <p className="text-xs text-slate-500">Inward/Outward parcel and letter registry</p>
              </div>
              <button onClick={() => setShowPostModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreatePost} className="space-y-4 text-xs">
              <div>
                <Label className="text-slate-700 font-semibold">Direction *</Label>
                <select
                  value={postForm.post_type}
                  onChange={(e) => setPostForm({ ...postForm, post_type: e.target.value as any })}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 mt-1 shadow-sm"
                >
                  <option value="INWARD">INWARD (Received at School)</option>
                  <option value="OUTWARD">OUTWARD (Dispatched by School)</option>
                </select>
              </div>

              <div>
                <Label className="text-slate-700 font-semibold">Article / Description *</Label>
                <Input
                  required
                  value={postForm.post_name}
                  onChange={(e) => setPostForm({ ...postForm, post_name: e.target.value })}
                  placeholder="e.g. Board Examination Papers Parcel"
                  className="bg-white border-slate-200 text-xs mt-1 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-slate-700 font-semibold">Sender (From)</Label>
                  <Input
                    value={postForm.for_post}
                    onChange={(e) => setPostForm({ ...postForm, for_post: e.target.value })}
                    placeholder="e.g. CBSE Regional Office"
                    className="bg-white border-slate-200 text-xs mt-1 text-slate-900"
                  />
                </div>
                <div>
                  <Label className="text-slate-700 font-semibold">Receiver (To)</Label>
                  <Input
                    value={postForm.to_post}
                    onChange={(e) => setPostForm({ ...postForm, to_post: e.target.value })}
                    placeholder="e.g. Principal Office"
                    className="bg-white border-slate-200 text-xs mt-1 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <Label className="text-slate-700 font-semibold">Courier Tracking #</Label>
                <Input
                  value={postForm.tracking_number}
                  onChange={(e) => setPostForm({ ...postForm, tracking_number: e.target.value })}
                  placeholder="e.g. DTDC-987654321"
                  className="bg-white border-slate-200 text-xs mt-1 text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" onClick={() => setShowPostModal(false)} variant="outline" className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" disabled={actionLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
                  {actionLoading ? "Saving..." : "Save Delivery Log"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 12. Supplier Modal */}
      {showSupplierModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base text-slate-900">Add Supplier Profile</h3>
              <button onClick={() => setShowSupplierModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateSupplier} className="space-y-4 text-xs">
              <div>
                <Label className="text-slate-700 font-semibold">Supplier Business Name *</Label>
                <Input
                  required
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                  placeholder="e.g. Apex Uniforms Ltd"
                  className="bg-white border-slate-200 text-xs mt-1 text-slate-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-slate-700 font-semibold">Contact Person</Label>
                  <Input
                    value={supplierForm.contact_person}
                    onChange={(e) => setSupplierForm({ ...supplierForm, contact_person: e.target.value })}
                    placeholder="e.g. Rajesh Sharma"
                    className="bg-white border-slate-200 text-xs mt-1 text-slate-900"
                  />
                </div>
                <div>
                  <Label className="text-slate-700 font-semibold">Phone</Label>
                  <Input
                    value={supplierForm.phone}
                    onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                    placeholder="9876543210"
                    className="bg-white border-slate-200 text-xs mt-1 text-slate-900"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" onClick={() => setShowSupplierModal(false)} variant="outline" className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" disabled={actionLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
                  Save Supplier
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 13. Warehouse Modal */}
      {showWarehouseModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base text-slate-900">Add Warehouse Location</h3>
              <button onClick={() => setShowWarehouseModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateWarehouse} className="space-y-4 text-xs">
              <div>
                <Label className="text-slate-700 font-semibold">Warehouse Code *</Label>
                <Input
                  required
                  value={warehouseForm.warehouse_code}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, warehouse_code: e.target.value.toUpperCase() })}
                  placeholder="e.g. WH-CHEMLAB"
                  className="bg-white border-slate-200 text-xs mt-1 text-slate-900"
                />
              </div>
              <div>
                <Label className="text-slate-700 font-semibold">Warehouse Name *</Label>
                <Input
                  required
                  value={warehouseForm.warehouse_name}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, warehouse_name: e.target.value })}
                  placeholder="e.g. Chemistry Lab Store"
                  className="bg-white border-slate-200 text-xs mt-1 text-slate-900"
                />
              </div>
              <div>
                <Label className="text-slate-700 font-semibold">Physical Location</Label>
                <Input
                  value={warehouseForm.location}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, location: e.target.value })}
                  placeholder="e.g. Science Block 2nd Floor"
                  className="bg-white border-slate-200 text-xs mt-1 text-slate-900"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" onClick={() => setShowWarehouseModal(false)} variant="outline" className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" disabled={actionLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
                  Save Warehouse
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 14. Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base text-slate-900">Add Inventory Category</h3>
              <button onClick={() => setShowCategoryModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateCategory} className="space-y-4 text-xs">
              <div>
                <Label className="text-slate-700 font-semibold">Category Name *</Label>
                <Input
                  required
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  placeholder="e.g. Laboratory Chemicals"
                  className="bg-white border-slate-200 text-xs mt-1 text-slate-900"
                />
              </div>
              <div>
                <Label className="text-slate-700 font-semibold">Category Code</Label>
                <Input
                  value={categoryForm.code}
                  onChange={(e) => setCategoryForm({ ...categoryForm, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. LAB-CHEM"
                  className="bg-white border-slate-200 text-xs mt-1 text-slate-900"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" onClick={() => setShowCategoryModal(false)} variant="outline" className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" disabled={actionLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
                  Save Category
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 15. Printable Receipt / Issue Slip Modal */}
      {receiptIssue && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="text-center border-b pb-4 mb-4">
              <h2 className="font-bold text-lg text-slate-900">STUDENT ISSUE RECEIPT</h2>
              <p className="text-xs text-slate-500">School Inventory Distribution Department</p>
              <span className="text-xs font-mono font-bold bg-slate-100 text-slate-800 px-2.5 py-0.5 rounded mt-2 inline-block">
                #{receiptIssue.issue_number}
              </span>
            </div>

            <div className="space-y-2 text-xs mb-4">
              <div className="flex justify-between">
                <span className="text-slate-500">Student Name:</span>
                <strong className="text-slate-900">{receiptIssue.student_name}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Class & Roll:</span>
                <span className="text-slate-900">
                  {receiptIssue.student_class} {receiptIssue.student_roll ? `• Roll ${receiptIssue.student_roll}` : ""}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Issue Date:</span>
                <span className="text-slate-900">{new Date(receiptIssue.issue_date).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Fulfilling Store:</span>
                <span className="text-slate-900">{receiptIssue.warehouse_name}</span>
              </div>
            </div>

            <div className="border-t border-b py-3 my-3 text-xs">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-slate-400 font-semibold">
                    <th>Item</th>
                    <th className="text-center">Qty</th>
                    <th className="text-right">Price</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {receiptIssue.items?.map((it, idx) => (
                    <tr key={idx} className="py-1.5">
                      <td className="py-1">
                        {it.item_name} {it.variant_size ? `(${it.variant_size})` : ""}
                      </td>
                      <td className="py-1 text-center">{it.quantity}</td>
                      <td className="py-1 text-right font-mono">₹{Number(it.unit_price).toFixed(2)}</td>
                      <td className="py-1 text-right font-mono font-bold">₹{Number(it.total_price).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between text-xs font-bold pt-1 mb-6">
              <span>Total Payable:</span>
              <span className="font-mono text-sm text-emerald-700">₹{Number(receiptIssue.total_amount).toFixed(2)}</span>
            </div>

            <div className="flex justify-end gap-2 no-print">
              <Button onClick={() => setReceiptIssue(null)} variant="outline" size="sm" className="text-xs">
                Close
              </Button>
              <Button onClick={() => window.print()} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1">
                <Printer className="w-3.5 h-3.5" /> Print Receipt
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
