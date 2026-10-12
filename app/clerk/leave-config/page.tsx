"use client";

import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Calendar,
  Settings,
  Plus,
  Edit2,
  Trash2,
  AlertCircle,
  RefreshCw,
  Sliders,
  Layers,
  Check,
  X,
  Loader2,
  CalendarDays,
  UserCheck,
  ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

import {
  getLeaveTemplates,
  createLeaveTemplate,
  updateLeaveTemplate,
  deleteLeaveTemplate,
  getLeaveTypes,
  createLeaveType,
  updateLeaveType,
  deleteLeaveType,
  type LeaveTemplate,
  type LeaveTypeRecord,
} from "@/lib/clerk";
import { getStaffCategories } from "@/lib/staff";

export default function LeaveConfigPage() {
  const [templates, setTemplates] = useState<LeaveTemplate[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("templates");
  const [dbCategories, setDbCategories] = useState<any[]>([]);

  // Template Modal Form state
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [isTemplateSubmitting, setIsTemplateSubmitting] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<LeaveTemplate | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [templateTimeline, setTemplateTimeline] = useState("ANNUAL");
  const [templateIsActive, setTemplateIsActive] = useState(true);

  // Leave Type Modal Form state
  const [isTypeDialogOpen, setIsTypeDialogOpen] = useState(false);
  const [isTypeSubmitting, setIsTypeSubmitting] = useState(false);
  const [editingType, setEditingType] = useState<LeaveTypeRecord | null>(null);
  const [editingGroupRecords, setEditingGroupRecords] = useState<LeaveTypeRecord[] | null>(null);
  const [typeName, setTypeName] = useState("");
  const [typeCode, setTypeCode] = useState("");
  const [typeTemplateId, setTypeTemplateId] = useState("");
  const [typeNum, setTypeNum] = useState<number>(0);
  const [typeAllocationPeriod, setTypeAllocationPeriod] = useState<string>("Yearly");
  const [typeIsPaid, setTypeIsPaid] = useState(true);
  const [typeAllowEncashment, setTypeAllowEncashment] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  // Alias for backward compatibility if referenced elsewhere
  const typeCategoryIds = selectedCategories.map(Number).filter((n) => !isNaN(n) && n > 0);
  const setTypeCategoryIds = (ids: (string | number)[]) => setSelectedCategories(ids.map(String));
  const [typeCarryForward, setTypeCarryForward] = useState(false);
  const [maxCarryForward, setMaxCarryForward] = useState<number>(0);

  // Deletion loading tracking
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Add-category-to-group inline panel state
  const [addCatForType, setAddCatForType] = useState<string | null>(null); // typeName of open panel
  const [addCatSelectedIds, setAddCatSelectedIds] = useState<number[]>([]);
  const [addCatSubmitting, setAddCatSubmitting] = useState(false);
  // Collapsible state for All Staff groups
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const toggleExpandGroup = (typeName: string) => {
    setExpandedGroups((prev) => ({ ...prev, [typeName]: !prev[typeName] }));
  };

  // Custom Confirmation Dialog State
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmDesc, setConfirmDesc] = useState("");
  const [onConfirmAction, setOnConfirmAction] = useState<(() => void) | null>(null);

  const triggerConfirm = (title: string, desc: string, action: () => void) => {
    setConfirmTitle(title);
    setConfirmDesc(desc);
    setOnConfirmAction(() => action);
    setIsConfirmOpen(true);
  };

  const PREDEFINED_STAFF_ROLES = [
    { id: 1, name: "Teacher" },
    { id: 2, name: "Clerk" },
    { id: 3, name: "Principal" },
    { id: 4, name: "Librarian" },
    { id: 5, name: "Vice Principal" },
    { id: 6, name: "Assistant Clerk" },
    { id: 7, name: "Transportation" },
    { id: 8, name: "Fees Management" },
    { id: 9, name: "Inventory" },
  ];

  const formatRoleLabel = (rawName: string) => {
    if (!rawName || rawName.trim().toLowerCase() === "all staff") return "General Staff";
    const name = String(rawName).trim().toUpperCase();
    if (name.includes("VICE PRINCIPAL") || name.includes("VICE_PRINCIPAL")) return "Vice Principal";
    if (name.includes("ASSISTANT CLERK") || name.includes("ASSISTANT_CLERK")) return "Assistant Clerk";
    if (name.includes("TEACHER")) return "Teacher";
    if (name.includes("CLERK")) return "Clerk";
    if (name.includes("PRINCIPAL")) return "Principal";
    if (name.includes("LIBRARIAN")) return "Librarian";
    if (name.includes("TRANSPORT")) return "Transportation";
    if (name.includes("FEE")) return "Fees Management";
    if (name.includes("INVENTORY")) return "Inventory";
    return String(rawName)
      .split(/[\s_]+/)
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  };

  // Available staff categories dynamically bound to PREDEFINED_STAFF_ROLES with DB feature IDs
  const availableCategories = useMemo(() => {
    return PREDEFINED_STAFF_ROLES.map((role) => {
      const roleUpper = role.name.toUpperCase();
      const match = (dbCategories || []).find((cat: any) => {
        const rawName = cat.feature_name || cat.name || cat.feature?.name || "";
        const formatted = formatRoleLabel(rawName).toUpperCase();
        return formatted === roleUpper;
      });

      const resolvedId =
        match && match.id != null && !isNaN(Number(match.id)) && Number(match.id) > 0
          ? Number(match.id)
          : role.id;

      return {
        id: resolvedId,
        name: role.name,
      };
    });
  }, [dbCategories]);

  const allAvailableCategoryIds = useMemo(
    () => availableCategories.map((r) => r.id),
    [availableCategories]
  );

  const normalizeToRoleId = (rawCat: any): number | null => {
    if (rawCat == null) return null;
    let nameStr = "";
    let rawNum: number | null = null;

    if (typeof rawCat === "object") {
      nameStr = rawCat.feature_name || rawCat.name || rawCat.feature?.name || "";
      if (rawCat.id != null) {
        const parsed = Number(rawCat.id);
        if (!isNaN(parsed)) rawNum = parsed;
      }
    } else if (typeof rawCat === "string") {
      const parsed = Number(rawCat);
      if (!isNaN(parsed)) {
        rawNum = parsed;
      } else {
        nameStr = rawCat;
      }
    } else if (typeof rawCat === "number") {
      if (!isNaN(rawCat)) rawNum = rawCat;
    }

    // Direct match against availableCategories by id
    if (rawNum != null) {
      const matchInAvailable = availableCategories.find((c) => c.id === rawNum);
      if (matchInAvailable) return matchInAvailable.id;
    }

    // Match by dbCategories (SchoolFeature)
    if (rawNum != null && dbCategories && dbCategories.length > 0) {
      const match = dbCategories.find(
        (c: any) =>
          Number(c.id) === rawNum ||
          Number(c.pk) === rawNum ||
          Number(c.feature_id) === rawNum
      );
      if (match) {
        nameStr = match.feature_name || match.name || match.feature?.name || "";
      }
    }

    if (nameStr) {
      const upper = nameStr.trim().toUpperCase();
      const matched = availableCategories.find((c) => {
        const cUpper = c.name.toUpperCase();
        if (upper.includes("VICE PRINCIPAL") || upper.includes("VICE_PRINCIPAL")) return cUpper === "VICE PRINCIPAL";
        if (upper.includes("ASSISTANT CLERK") || upper.includes("ASSISTANT_CLERK")) return cUpper === "ASSISTANT CLERK";
        if (upper.includes("TEACH")) return cUpper === "TEACHER";
        if (upper.includes("CLERK")) return cUpper === "CLERK";
        if (upper.includes("PRINCIPAL")) return cUpper === "PRINCIPAL";
        if (upper.includes("LIBRAR")) return cUpper === "LIBRARIAN";
        if (upper.includes("TRANS")) return cUpper === "TRANSPORTATION";
        if (upper.includes("ACCOUNT") || upper.includes("FEE")) return cUpper === "FEES MANAGEMENT";
        if (upper.includes("INVENT")) return cUpper === "INVENTORY";
        return false;
      });
      if (matched) return matched.id;
    }

    // Feature ID mapping fallback
    if (rawNum === 10) return availableCategories.find((c) => c.name === "Teacher")?.id ?? 1;
    if (rawNum === 11) return availableCategories.find((c) => c.name === "Clerk")?.id ?? 2;
    if (rawNum === 12) return availableCategories.find((c) => c.name === "Vice Principal")?.id ?? 5;
    if (rawNum === 13) return availableCategories.find((c) => c.name === "Assistant Clerk")?.id ?? 6;
    if (rawNum === 14) return availableCategories.find((c) => c.name === "Inventory")?.id ?? 9;
    if (rawNum === 15) return availableCategories.find((c) => c.name === "Fees Management")?.id ?? 8;
    if (rawNum === 16) return availableCategories.find((c) => c.name === "Librarian")?.id ?? 4;
    if (rawNum === 17) return availableCategories.find((c) => c.name === "Principal")?.id ?? 3;
    if (rawNum === 18) return availableCategories.find((c) => c.name === "Transportation")?.id ?? 7;

    return null;
  };

  const getCategoryName = (catInput?: any): string => {
    if (catInput == null) {
      return "General Staff";
    }

    if (Array.isArray(catInput)) {
      if (catInput.length === 0) return "General Staff";
      return (
        Array.from(
          new Set(
            catInput
              .map((c) => getCategoryName(c))
              .filter((n) => n && n !== "General Staff" && n !== "All Staff")
          )
        ).join(", ") || "General Staff"
      );
    }

    const roleId = normalizeToRoleId(catInput);
    if (roleId != null) {
      const matched = availableCategories.find((r) => r.id === roleId);
      if (matched) return matched.name;
    }

    if (typeof catInput === "object") {
      const rawName = catInput.feature_name || catInput.name || catInput.feature?.name;
      if (rawName && rawName.trim().toLowerCase() !== "all staff") return formatRoleLabel(rawName);
      if (catInput.id != null) return getCategoryName(catInput.id);
      return "General Staff";
    }

    const numId = Number(catInput);
    if (!isNaN(numId)) {
      const matched = availableCategories.find((r) => r.id === numId);
      if (matched) return matched.name;
    }

    if (typeof catInput === "string" && catInput.trim() && catInput.trim() !== "NaN" && catInput.trim().toLowerCase() !== "all staff") {
      return formatRoleLabel(catInput.trim());
    }

    return "General Staff";
  };

  const isAllCategoriesSelected =
    availableCategories.length > 0 &&
    selectedCategories.length === availableCategories.length;

  const toggleCategory = (rawId: number | string) => {
    const id = String(rawId);
    if (!id || id === "NaN" || id === "undefined") return;

    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const toggleSelectAllCategories = () => {
    if (selectedCategories.length === availableCategories.length && availableCategories.length > 0) {
      setSelectedCategories([]);
    } else {
      setSelectedCategories(availableCategories.map((r) => String(r.id)));
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [templatesData, typesData, catsData] = await Promise.all([
        getLeaveTemplates(),
        getLeaveTypes(),
        getStaffCategories().catch(() => []),
      ]);
      setTemplates(Array.isArray(templatesData) ? templatesData : (templatesData as any)?.results ?? []);
      setLeaveTypes(Array.isArray(typesData) ? typesData : (typesData as any)?.results ?? []);
      const rawCats = Array.isArray(catsData) ? catsData : (catsData as any)?.results ?? [];
      setDbCategories(rawCats);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to load leave settings configurations. Please verify your connection.");
      toast.error("Error loading settings");
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Leave Templates CRUD Actions ───────────────────────────────────────────

  const handleOpenCreateTemplate = () => {
    setEditingTemplate(null);
    setTemplateName("");
    setTemplateTimeline("ANNUAL");
    setTemplateIsActive(true);
    setIsTemplateDialogOpen(true);
  };

  const handleOpenEditTemplate = (tmpl: LeaveTemplate) => {
    setEditingTemplate(tmpl);
    setTemplateName(tmpl.name || "");
    setTemplateTimeline(tmpl.time_line || "ANNUAL");
    setTemplateIsActive(tmpl.is_active !== false);
    setIsTemplateDialogOpen(true);
  };

  const handleTemplateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName.trim()) {
      toast.error("Please enter a policy name.");
      return;
    }
    setIsTemplateSubmitting(true);
    try {
      const payload = {
        name: templateName.trim(),
        time_line: templateTimeline.trim() || "ANNUAL",
        is_active: templateIsActive,
      };
      if (editingTemplate) {
        await updateLeaveTemplate(editingTemplate.id, payload);
        toast.success("Leave policy updated successfully");
      } else {
        await createLeaveTemplate(payload);
        toast.success("Leave policy created successfully");
      }
      setIsTemplateDialogOpen(false);
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to save template");
    } finally {
      setIsTemplateSubmitting(false);
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    triggerConfirm(
      "Delete Leave Template?",
      "Are you sure you want to delete this leave template? Associated leave types might be affected.",
      async () => {
        setDeletingId(id);
        try {
          await deleteLeaveTemplate(id);
          setTemplates((prev) => prev.filter((t) => t.id !== id));
          toast.success("Leave template deleted successfully");
        } catch (err: any) {
          console.error(err);
          toast.error(err?.message || "Failed to delete leave template");
          fetchData();
        } finally {
          setDeletingId(null);
        }
      }
    );
  };

  // ─── Leave Types CRUD Actions ──────────────────────────────────────────────

  const handleOpenCreateType = () => {
    setEditingType(null);
    setEditingGroupRecords(null);
    setTypeName("");
    setTypeCode("");
    setTypeTemplateId(templates[0] ? String(templates[0].id) : "");
    setTypeNum(1);
    setTypeAllocationPeriod("Yearly");
    setTypeIsPaid(true);
    setTypeAllowEncashment(false);
    setSelectedCategories([]);
    setTypeCarryForward(false);
    setMaxCarryForward(0);
    setIsTypeDialogOpen(true);
  };

  const handleOpenEditType = (typeRec: LeaveTypeRecord, groupRecords?: LeaveTypeRecord[]) => {
    setEditingType(typeRec);
    const recordsToUse = groupRecords && groupRecords.length > 0 ? groupRecords : [typeRec];
    setEditingGroupRecords(recordsToUse);
    setTypeName(typeRec.name || typeRec.leave_type || "");
    setTypeCode(typeRec.code || "");
    setTypeTemplateId(String(typeRec.leave_template || ""));
    const count = Number(typeRec.allocation_count ?? typeRec.leave_num ?? 0);
    setTypeNum(isNaN(count) ? 0 : count);
    setTypeAllocationPeriod(typeRec.allocation_period || "Yearly");
    setTypeIsPaid(typeRec.is_paid !== false);
    setTypeAllowEncashment(!!typeRec.allow_encashment);

    // Sanitize and deduplicate incoming category IDs from backend
    const extractedIds: number[] = [];
    recordsToUse.forEach((r, idx) => {
      const raw = (r as any).categories ?? r.category;
      if (Array.isArray(raw)) {
        raw.forEach((c) => {
          const roleId = normalizeToRoleId(c);
          if (roleId != null && allAvailableCategoryIds.includes(roleId)) {
            extractedIds.push(roleId);
          }
        });
      } else if (raw != null) {
        const roleId = normalizeToRoleId(raw);
        if (roleId != null && allAvailableCategoryIds.includes(roleId)) {
          extractedIds.push(roleId);
        }
      } else {
        const fallbackId = allAvailableCategoryIds[idx % (allAvailableCategoryIds.length || 1)];
        if (fallbackId != null) extractedIds.push(fallbackId);
      }
    });

    const sanitizedUniqueIds = Array.from(new Set(extractedIds.map(String)));
    setSelectedCategories(
      Array.from(
        new Set(
          sanitizedUniqueIds.length > 0
            ? sanitizedUniqueIds
            : allAvailableCategoryIds.slice(0, 1).map(String)
        )
      )
    );

    setTypeCarryForward(!!(typeRec.carry_forward || typeRec.is_carry_forward));
    setMaxCarryForward(Number(typeRec.max_carry_forward || 0));
    setIsTypeDialogOpen(true);
  };

  const handleTypeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typeName || !typeTemplateId || typeNum < 0) {
      toast.error("Please fill out all fields correctly.");
      return;
    }
    if (selectedCategories.length === 0) {
      toast.error("Please select at least one staff category.");
      return;
    }
    setIsTypeSubmitting(true);

    try {
      const basePayload = {
        name: typeName.trim(),
        leave_type: typeName.trim().toUpperCase(),
        code: typeCode.trim().toUpperCase() || undefined,
        leave_template: Number(typeTemplateId),
        leave_num: typeNum,
        allocation_count: typeNum,
        allocation_period: typeAllocationPeriod,
        is_paid: typeIsPaid,
        allow_encashment: typeAllowEncashment,
        is_carry_forward: typeCarryForward,
        carry_forward: typeCarryForward,
        max_carry_forward: typeCarryForward ? maxCarryForward : 0,
      };

      if (editingType) {
        // Edit mode: update existing records with PUT/PATCH
        const group = editingGroupRecords && editingGroupRecords.length > 0 ? editingGroupRecords : [editingType];
        
        // 1. Existing categories still selected -> update via PATCH
        const remainingRecords = group.filter((r) => typeCategoryIds.includes(Number(r.category)));
        const updatePromises = remainingRecords.map((r) =>
          updateLeaveType(r.id, {
            ...basePayload,
            category: r.category,
          })
        );

        // 2. Categories in original group that were unselected -> delete
        const removedRecords = group.filter((r) => !typeCategoryIds.includes(Number(r.category)));
        const deletePromises = removedRecords.map((r) => deleteLeaveType(r.id));

        // 3. New categories selected that were not in original group -> create
        const existingCatIds = group.map((r) => Number(r.category));
        const newCatIds = typeCategoryIds.filter((id) => !existingCatIds.includes(id));
        const createPromises = newCatIds.map((catId) =>
          createLeaveType({
            ...basePayload,
            category: catId,
          })
        );

        await Promise.all([...updatePromises, ...deletePromises, ...createPromises]);
        toast.success("Leave type updated successfully");
        setIsTypeDialogOpen(false);
        fetchData();
      } else {
        // Create mode: one record per selected category
        const results = await Promise.allSettled(
          typeCategoryIds.map((catId) =>
            createLeaveType({
              ...basePayload,
              category: catId,
            })
          )
        );

        const succeeded = results.filter((r) => r.status === "fulfilled").length;
        const failed = results
          .map((r, i) => ({ result: r, catId: typeCategoryIds[i] }))
          .filter(({ result }) => result.status === "rejected");

        if (succeeded > 0) {
          toast.success(`Leave type created for ${succeeded} category(s)`);
        }

        if (failed.length > 0) {
          failed.forEach(({ result, catId }) => {
            const err = (result as PromiseRejectedResult).reason;
            const msg: string = err?.message || "";
            const catName = getCategoryName(catId);
            if (
              msg.toLowerCase().includes("unique set") ||
              msg.toLowerCase().includes("unique") ||
              msg.toLowerCase().includes("already exists")
            ) {
              toast.warning(`"${typeName.toUpperCase()}" already exists for ${catName} — skipped`);
            } else {
              toast.error(`Failed for ${catName}: ${msg || "Unknown error"}`);
            }
          });
        }

        if (succeeded > 0) {
          setIsTypeDialogOpen(false);
          fetchData();
        }
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to save leave type");
    } finally {
      setIsTypeSubmitting(false);
    }
  };

  // ─── Add more categories to an existing grouped leave type ─────────────────
  const handleAddCategoriesToGroup = async (
    typeName: string,
    existingRecords: LeaveTypeRecord[],
    newCatIds: number[]
  ) => {
    if (newCatIds.length === 0) return;
    setAddCatSubmitting(true);
    const first = existingRecords[0];
    try {
      const results = await Promise.allSettled(
        newCatIds.map((catId) =>
          createLeaveType({
            name: first.name || typeName,
            leave_type: typeName,
            code: first.code,
            leave_template: first.leave_template,
            leave_num: first.leave_num,
            allocation_count: first.allocation_count ?? first.leave_num,
            allocation_period: first.allocation_period || "Yearly",
            is_paid: first.is_paid !== false,
            allow_encashment: !!first.allow_encashment,
            category: catId,
            is_carry_forward: first.is_carry_forward,
            carry_forward: first.carry_forward ?? first.is_carry_forward,
            max_carry_forward: first.max_carry_forward ?? 0,
          })
        )
      );
      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;
      if (succeeded > 0) toast.success(`Added ${succeeded} category(s) to "${typeName}"`);
      if (failed > 0) toast.warning(`${failed} category(s) already exist or failed — skipped`);
      if (succeeded > 0) {
        setAddCatForType(null);
        setAddCatSelectedIds([]);
        fetchData();
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to add categories");
    } finally {
      setAddCatSubmitting(false);
    }
  };

  const handleDeleteTypeGroup = async (typeName: string, records: LeaveTypeRecord[]) => {
    triggerConfirm(
      `Delete Leave Type "${typeName}"?`,
      `Are you sure you want to delete "${typeName}"? This will remove it for all associated staff categories.`,
      async () => {
        const ids = records.map((r) => r.id);
        setDeletingId(records[0]?.id ?? null);
        try {
          await Promise.all(ids.map((id) => deleteLeaveType(id)));
          setLeaveTypes((prev) => prev.filter((r) => !ids.includes(r.id)));
          toast.success(`Leave type "${typeName}" deleted successfully`);
        } catch (err: any) {
          console.error(err);
          toast.error(err?.message || "Failed to delete leave type");
          fetchData();
        } finally {
          setDeletingId(null);
        }
      }
    );
  };

  const handleDeleteSingleType = async (rec: LeaveTypeRecord) => {
    triggerConfirm(
      "Remove Category from Leave Type?",
      `Are you sure you want to remove this category from "${rec.leave_type}"?`,
      async () => {
        setDeletingId(rec.id);
        try {
          await deleteLeaveType(rec.id);
          setLeaveTypes((prev) => prev.filter((r) => r.id !== rec.id));
          toast.success("Category removed successfully");
        } catch (err: any) {
          console.error(err);
          toast.error(err?.message || "Failed to remove category");
          fetchData();
        } finally {
          setDeletingId(null);
        }
      }
    );
  };

  const getTimelineDisplay = (timeline?: string | null) => {
    if (!timeline) return "ANNUAL (1 Year)";
    const t = String(timeline).toUpperCase();
    if (t === "MONTHLY") return "MONTHLY (1 Month)";
    if (t === "QUARTERLY") return "QUARTERLY (4 Months)";
    if (t === "SEMI_ANNUAL") return "SEMI_ANNUAL (6 Months)";
    if (t === "ANNUAL") return "ANNUAL (1 Year)";
    return timeline;
  };

  const getTemplateName = (templateId: number) => {
    const tmpl = templates.find((t) => t.id === templateId);
    return tmpl ? getTimelineDisplay(tmpl.time_line) : `Template ID: ${templateId}`;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Settings className="h-8 w-8 text-primary" />
            </div>
            Leave Settings Configuration
          </h1>
          <p className="text-muted-foreground mt-1.5 text-sm md:text-base">
            Configure leave templates (timelines) and define limits/allocations for specific leave types.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="default"
            onClick={activeTab === "templates" ? handleOpenCreateTemplate : handleOpenCreateType}
            className="flex items-center gap-2 shadow-sm hover:shadow-md transition-all scale-100 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            Add {activeTab === "templates" ? "Template" : "Leave Type"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={isLoading}
            className="flex items-center gap-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shadow-xs"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="animate-in fade-in-50 slide-in-from-top-4 duration-300">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Configuration Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Layout Tabs - Forced flex-col layout to stack tabs and configurations vertically */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col gap-6">
        <div className="flex border-b pb-2">
          <TabsList className="bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl">
            <TabsTrigger value="templates" className="px-5 py-2 text-sm font-semibold flex items-center gap-2 rounded-lg transition-all">
              <Sliders className="h-4 w-4" />
              Templates ({templates.length})
            </TabsTrigger>
            <TabsTrigger value="types" className="px-5 py-2 text-sm font-semibold flex items-center gap-2 rounded-lg transition-all">
              <Layers className="h-4 w-4" />
              Leave Types ({new Set(leaveTypes.map(t => t.leave_type)).size})
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Loading Skeletons */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse border border-zinc-250 bg-white">
                <CardContent className="h-32" />
              </Card>
            ))}
          </div>
        )}

        {/* Templates Panel */}
        {!isLoading && (
          <TabsContent value="templates" className="mt-0 focus-visible:outline-none w-full">
            <AnimatePresence mode="popLayout">
              {templates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 border rounded-2xl border-dashed bg-white/40">
                  <Sliders className="h-12 w-12 text-muted-foreground/35 mb-3" />
                  <p className="text-zinc-800 dark:text-zinc-200 font-semibold">No Templates Registered</p>
                  <Button size="sm" variant="outline" className="mt-4" onClick={handleOpenCreateTemplate}>
                    Create First Template
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                  {templates.map((tmpl) => (
                    <motion.div
                      key={tmpl.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Card className="relative overflow-hidden border border-zinc-200/80 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md shadow-xs hover:shadow-md transition-all duration-300">
                        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary/70 to-primary" />
                        <CardHeader className="pb-3 flex flex-row items-center justify-between">
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                              Timeline Policy
                            </span>
                            <CardTitle className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                              {tmpl.name || getTimelineDisplay(tmpl.time_line)}
                            </CardTitle>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              size="xs"
                              variant="ghost"
                              onClick={() => handleOpenEditTemplate(tmpl)}
                              className="h-8 w-8 p-0 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                              title="Edit Template"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="xs"
                              variant="ghost"
                              onClick={() => handleDeleteTemplate(tmpl.id)}
                              disabled={deletingId === tmpl.id}
                              className="h-8 w-8 p-0 text-zinc-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 disabled:opacity-40"
                              title="Delete Template"
                            >
                              {deletingId === tmpl.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex items-center justify-between text-xs pt-1 border-t dark:border-zinc-850">
                            <span className="text-muted-foreground font-medium">Timeline Cycle</span>
                            <span className="font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                              <CalendarDays className="h-3.5 w-3.5 text-primary" />
                              {getTimelineDisplay(tmpl.time_line)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground font-medium">Status</span>
                            <Badge
                              variant="outline"
                              className={tmpl.is_active !== false ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-zinc-100 text-zinc-600"}
                            >
                              {tmpl.is_active !== false ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </TabsContent>
        )}

        {/* Leave Types Panel */}
        {!isLoading && (
          <TabsContent value="types" className="mt-0 focus-visible:outline-none w-full">
            <AnimatePresence mode="popLayout">
              {leaveTypes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 border rounded-2xl border-dashed bg-white/40">
                  <Layers className="h-12 w-12 text-muted-foreground/35 mb-3" />
                  <p className="text-zinc-800 dark:text-zinc-200 font-semibold">No Leave Types Defined</p>
                  <Button size="sm" variant="outline" className="mt-4" onClick={handleOpenCreateType}>
                    Define First Leave Type
                  </Button>
                </div>
              ) : (() => {
                // Group leave type records by leave_type name so all categories
                // for the same leave type appear in ONE single card.
                const grouped = leaveTypes.reduce<Record<string, LeaveTypeRecord[]>>((acc, rec) => {
                  const key = rec.leave_type;
                  if (!acc[key]) acc[key] = [];
                  acc[key].push(rec);
                  return acc;
                }, {});
                const groups = Object.entries(grouped); // [ [typeName, records[]], ... ]

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
                    {groups.map(([typeName, records]) => {
                      // Use the first record as the "representative" for shared fields
                      const first = records[0];
                      const isAnyDeleting = records.some((r) => deletingId === r.id);

                      return (
                        <motion.div
                          key={typeName}
                          layout
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Card className="relative overflow-hidden border border-zinc-200/80 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md shadow-xs hover:shadow-md transition-all duration-300">
                            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-400 to-emerald-500" />

                            {/* Header */}
                            {(() => {
                              const distinctRolesMap = new Map<string, { id?: number; name: string; record: LeaveTypeRecord }>();

                              records.forEach((rec, idx) => {
                                const rawCats = (rec as any).categories ?? (rec as any).roles ?? rec.category;
                                if (Array.isArray(rawCats)) {
                                  rawCats.forEach((catVal) => {
                                    const roleId = normalizeToRoleId(catVal);
                                    const resolvedName = roleId != null ? getCategoryName(roleId) : getCategoryName(catVal);
                                    if (resolvedName && resolvedName !== "All Staff" && resolvedName !== "General Staff" && !distinctRolesMap.has(resolvedName)) {
                                      distinctRolesMap.set(resolvedName, {
                                        id: roleId ?? undefined,
                                        name: resolvedName,
                                        record: rec,
                                      });
                                    }
                                  });
                                } else if (rawCats != null) {
                                  const roleId = normalizeToRoleId(rawCats);
                                  const resolvedName = roleId != null ? getCategoryName(roleId) : getCategoryName(rawCats);
                                  if (resolvedName && resolvedName !== "All Staff" && resolvedName !== "General Staff" && !distinctRolesMap.has(resolvedName)) {
                                    distinctRolesMap.set(resolvedName, {
                                      id: roleId ?? undefined,
                                      name: resolvedName,
                                      record: rec,
                                    });
                                  }
                                } else {
                                  const fallbackId = (idx % 9) + 1;
                                  const resolvedName = getCategoryName(fallbackId);
                                  if (!distinctRolesMap.has(resolvedName)) {
                                    distinctRolesMap.set(resolvedName, {
                                      id: fallbackId,
                                      name: resolvedName,
                                      record: rec,
                                    });
                                  }
                                }
                              });

                              const distinctRoles = Array.from(distinctRolesMap.values());
                              const distinctRolesCount = distinctRoles.length;

                              const allowedCount =
                                first.allocation_count != null && !isNaN(Number(first.allocation_count))
                                  ? Number(first.allocation_count)
                                  : first.leave_num != null && !isNaN(Number(first.leave_num))
                                  ? Number(first.leave_num)
                                  : 0;

                              return (
                                <>
                                  <CardHeader className="pb-3 flex flex-row items-start justify-between gap-2">
                                    <div className="space-y-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                          {distinctRolesCount} {distinctRolesCount === 1 ? "Role" : "Roles"}
                                        </span>
                                        <Badge variant="outline" className="text-xs font-semibold bg-emerald-500/10 text-emerald-600 border-emerald-200/50">
                                          Allowed: {allowedCount} days
                                        </Badge>
                                      </div>
                                      <CardTitle className="text-lg font-bold text-zinc-900 dark:text-zinc-50 truncate" title={typeName}>
                                        {typeName}
                                      </CardTitle>
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                      <Button
                                        size="xs"
                                        variant="ghost"
                                        onClick={() => handleOpenEditType(first, records)}
                                        className="h-8 w-8 p-0 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                        title="Edit Leave Type"
                                      >
                                        <Edit2 className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button
                                        size="xs"
                                        variant="ghost"
                                        onClick={() => handleDeleteTypeGroup(typeName, records)}
                                        disabled={isAnyDeleting}
                                        className="h-8 w-8 p-0 text-zinc-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 disabled:opacity-40"
                                        title="Delete Leave Type"
                                      >
                                        {isAnyDeleting ? (
                                          <Loader2 className="h-3.5 w-3.5 animate-spin text-rose-600" />
                                        ) : (
                                          <Trash2 className="h-3.5 w-3.5" />
                                        )}
                                      </Button>
                                    </div>
                                  </CardHeader>

                                  <CardContent className="space-y-3">
                                    {/* Shared info row */}
                                    <div className="grid grid-cols-2 gap-y-2 text-xs pt-1 border-t dark:border-zinc-850">
                                      <div>
                                        <span className="text-muted-foreground block">Template Period</span>
                                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                                          {getTemplateName(first.leave_template)}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground block">Carry Forward</span>
                                        <Badge
                                          variant="outline"
                                          className={cn(
                                            "font-semibold text-[10px] rounded-full mt-0.5",
                                            first.is_carry_forward
                                              ? "bg-sky-50 text-sky-700 border-sky-200"
                                              : "bg-zinc-100 text-zinc-500 border-zinc-200"
                                          )}
                                        >
                                          {first.is_carry_forward ? "Enabled" : "Disabled"}
                                        </Badge>
                                      </div>
                                    </div>

                                    <div className="pt-2 border-t dark:border-zinc-850 space-y-1.5">
                                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                                        Staff Roles ({distinctRolesCount})
                                      </span>
                                      <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-0.5">
                                        {distinctRoles.map((item, idx) => (
                                          <div
                                            key={`role-item-${item.record.id}-${item.id ?? idx}-${idx}`}
                                            className="flex items-center justify-between rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700 px-3 py-1.5"
                                          >
                                            <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                                              <UserCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                                              {item.name}
                                            </span>
                                            {distinctRoles.length > 1 && (
                                              <Button
                                                size="xs"
                                                variant="ghost"
                                                onClick={() => handleDeleteSingleType(item.record)}
                                                disabled={deletingId === item.record.id}
                                                className="h-6 w-6 p-0 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 disabled:opacity-40"
                                                title={`Remove ${item.name}`}
                                              >
                                                {deletingId === item.record.id ? (
                                                  <Loader2 className="h-3 w-3 animate-spin" />
                                                ) : (
                                                  <Trash2 className="h-3 w-3" />
                                                )}
                                              </Button>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>

                                {/* + Add Category button & inline panel */}
                                {(() => {
                                  const existingCatIds = Array.from(
                                    new Set(records.map((r) => normalizeToRoleId(r.category) ?? Number(r.category)).filter((n) => !isNaN(n)))
                                  );
                                  const availableCats = availableCategories.filter(
                                    (c) => !existingCatIds.includes(c.id)
                                  );
                                  const isPanelOpen = addCatForType === typeName;

                                  return (
                                    <div className="pt-1">
                                      {availableCats.length > 0 && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (isPanelOpen) {
                                              setAddCatForType(null);
                                              setAddCatSelectedIds([]);
                                            } else {
                                              setAddCatForType(typeName);
                                              setAddCatSelectedIds([]);
                                            }
                                          }}
                                          className="w-full flex items-center justify-center gap-1.5 text-xs text-primary font-semibold border border-dashed border-primary/40 rounded-lg py-1.5 hover:bg-primary/5 transition-colors"
                                        >
                                          <Plus className="h-3.5 w-3.5" />
                                          {isPanelOpen ? "Cancel" : "Add Category"}
                                        </button>
                                      )}

                                      <AnimatePresence>
                                        {isPanelOpen && (
                                          <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: "auto" }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="overflow-hidden"
                                          >
                                            <div className="mt-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-800">
                                              {availableCats.map((cat, idx) => {
                                                const catNumId = Number(cat.id);
                                                const catName = cat.name;
                                                const isChecked = addCatSelectedIds.includes(catNumId);
                                                return (
                                                  <label
                                                    key={`avail-${cat.id || idx}-${idx}`}
                                                    className={`flex items-center gap-3 px-3 py-2 cursor-pointer text-sm select-none transition-colors ${
                                                      isChecked
                                                        ? "bg-primary/8 text-primary font-medium"
                                                        : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                                                    }`}
                                                  >
                                                    <input
                                                      type="checkbox"
                                                      className="h-4 w-4 rounded accent-primary cursor-pointer"
                                                      checked={isChecked}
                                                      onChange={(e) => {
                                                        if (e.target.checked) {
                                                          setAddCatSelectedIds((prev) => Array.from(new Set([...prev.map(Number), catNumId])));
                                                        } else {
                                                          setAddCatSelectedIds((prev) => prev.map(Number).filter((id) => id !== catNumId));
                                                        }
                                                      }}
                                                    />
                                                    <UserCheck className="h-3.5 w-3.5 text-primary/60 shrink-0" />
                                                    {catName}
                                                  </label>
                                                );
                                              })}
                                            </div>
                                            <Button
                                              size="sm"
                                              className="w-full mt-2 h-8 text-xs"
                                              disabled={addCatSelectedIds.length === 0 || addCatSubmitting}
                                              onClick={() => handleAddCategoriesToGroup(typeName, records, addCatSelectedIds)}
                                            >
                                              {addCatSubmitting ? (
                                                <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> Adding...</>
                                              ) : (
                                                <>Add {addCatSelectedIds.length > 0 ? `${addCatSelectedIds.length} ` : ""}Category</>
                                              )}
                                            </Button>
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                    </div>
                                  );
                                })()}
                              </CardContent>
                            </>
                          );
                        })()}
                      </Card>
                        </motion.div>
                      );
                    })}
                  </div>
                );
              })()}
            </AnimatePresence>
          </TabsContent>
        )}
      </Tabs>

      {/* Leave Template Modal Form */}
      <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
        <DialogContent className="max-w-md w-full max-h-[90vh] sm:max-h-[85vh] flex flex-col p-0 overflow-hidden bg-white dark:bg-zinc-950 border dark:border-zinc-800 shadow-2xl rounded-2xl gap-0">
          <DialogHeader className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 shrink-0 bg-white dark:bg-zinc-950">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Sliders className="h-5 w-5 text-primary" />
              {editingTemplate ? "Edit Leave Policy" : "Create Leave Policy"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Define a dynamic leave policy template and cycle for your staff.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleTemplateSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="overflow-y-auto px-6 py-4 space-y-4 flex-1">
              <div className="space-y-1.5">
                <Label htmlFor="template-name" className="text-xs font-semibold">Policy Name</Label>
                <Input
                  id="template-name"
                  placeholder="e.g., Teaching Staff Policy, Annual Staff Leave Policy"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  required
                  className="rounded-lg bg-zinc-50 dark:bg-zinc-900 border dark:border-zinc-800 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="template-timeline" className="text-xs font-semibold">Policy Cycle / Timeline</Label>
                <Input
                  id="template-timeline"
                  placeholder="e.g., 2026-2027, ANNUAL, MONTHLY"
                  value={templateTimeline}
                  onChange={(e) => setTemplateTimeline(e.target.value)}
                  className="rounded-lg bg-zinc-50 dark:bg-zinc-900 border dark:border-zinc-800 text-sm"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
                <div className="space-y-0.5">
                  <Label htmlFor="template-active" className="text-xs font-semibold">Active Policy</Label>
                  <span className="text-[10px] text-muted-foreground block">
                    Enable this template for new employee assignments.
                  </span>
                </div>
                <Switch
                  id="template-active"
                  checked={templateIsActive}
                  onCheckedChange={setTemplateIsActive}
                />
              </div>
            </div>

            <DialogFooter className="px-6 py-3.5 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/60 backdrop-blur-xs shrink-0 flex items-center justify-end gap-3 mt-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsTemplateDialogOpen(false)}
                className="rounded-lg border shadow-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isTemplateSubmitting}
                className="rounded-lg bg-primary hover:bg-primary/95 text-primary-foreground font-semibold shadow-sm hover:shadow-md transition-all flex items-center gap-2"
              >
                {isTemplateSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Save Template
                    <Check className="h-4 w-4" />
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Leave Type Modal Form */}
      <Dialog open={isTypeDialogOpen} onOpenChange={setIsTypeDialogOpen}>
        <DialogContent className="max-w-xl w-full max-h-[92vh] sm:max-h-[88vh] flex flex-col p-0 overflow-hidden bg-white dark:bg-zinc-950 border dark:border-zinc-800 shadow-2xl rounded-2xl gap-0">
          <DialogHeader className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 shrink-0 bg-white dark:bg-zinc-950">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              {editingType ? "Edit Leave Category" : "Define Leave Type"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Define the category limits, applicability rules, and carry forward settings.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleTypeSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="overflow-y-auto px-6 py-4 space-y-4 flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="type-name" className="text-xs font-semibold">Category Name (e.g. SICK, CASUAL)</Label>
                  <Input
                    id="type-name"
                    placeholder="e.g., CASUAL"
                    value={typeName}
                    onChange={(e) => setTypeName(e.target.value)}
                    required
                    className="rounded-lg shadow-inner bg-zinc-50 dark:bg-zinc-900 border dark:border-zinc-800 text-sm focus-visible:ring-1 focus-visible:ring-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="type-code" className="text-xs font-semibold">Short Code (e.g. CL, SL, EL)</Label>
                  <Input
                    id="type-code"
                    placeholder="e.g., CL"
                    value={typeCode}
                    onChange={(e) => setTypeCode(e.target.value)}
                    className="rounded-lg shadow-inner bg-zinc-50 dark:bg-zinc-900 border dark:border-zinc-800 text-sm focus-visible:ring-1 focus-visible:ring-primary uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="type-num" className="text-xs font-semibold">Allowed Leaves Count</Label>
                  <Input
                    id="type-num"
                    type="number"
                    min="0"
                    value={typeNum}
                    onChange={(e) => setTypeNum(Number(e.target.value))}
                    required
                    className="rounded-lg shadow-inner bg-zinc-50 dark:bg-zinc-900 border dark:border-zinc-800 text-sm focus-visible:ring-1 focus-visible:ring-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="allocation-period" className="text-xs font-semibold">Allocation Period</Label>
                  <Select value={typeAllocationPeriod} onValueChange={(val) => setTypeAllocationPeriod(val || "Yearly")}>
                    <SelectTrigger id="allocation-period" className="w-full rounded-lg bg-zinc-50 dark:bg-zinc-900 border dark:border-zinc-800 text-sm">
                      <SelectValue placeholder="Period" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-zinc-950 border dark:border-zinc-800">
                      <SelectItem value="Monthly">Monthly</SelectItem>
                      <SelectItem value="Quarterly">Quarterly</SelectItem>
                      <SelectItem value="Yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Staff Categories</Label>
                  {selectedCategories.length > 0 && (
                    <span className="text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                      {selectedCategories.length} selected
                    </span>
                  )}
                </div>

                <div className="rounded-lg border dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 divide-y dark:divide-zinc-800 max-h-48 overflow-y-auto">
                  {/* Select All Roles Option */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={toggleSelectAllCategories}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggleSelectAllCategories();
                      }
                    }}
                    className={`flex items-center justify-between px-3 py-2.5 cursor-pointer transition-colors text-xs font-bold border-b border-zinc-200 dark:border-zinc-800 select-none ${
                      isAllCategoriesSelected
                        ? "bg-primary/10 text-primary"
                        : "bg-zinc-100/90 dark:bg-zinc-800/90 hover:bg-zinc-200/80 text-zinc-800 dark:text-zinc-200"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded accent-primary pointer-events-none"
                        checked={isAllCategoriesSelected}
                        readOnly
                      />
                      <span>Select All Roles</span>
                    </div>
                    <span className="text-[10px] font-normal text-muted-foreground">
                      ({selectedCategories.length}/{availableCategories.length})
                    </span>
                  </div>

                  {/* Individual Role Options */}
                  {availableCategories.map((role) => {
                    const roleId = String(role.id);
                    const isChecked = selectedCategories.includes(roleId);

                    return (
                      <div
                        key={`cat-option-${roleId}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => toggleCategory(roleId)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            toggleCategory(roleId);
                          }
                        }}
                        className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors text-sm select-none ${
                          isChecked
                            ? "bg-primary/8 dark:bg-primary/20 text-primary font-medium"
                            : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded accent-primary pointer-events-none"
                          checked={isChecked}
                          readOnly
                        />
                        <UserCheck className="h-3.5 w-3.5 text-primary/60 shrink-0" />
                        <span>{role.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="type-template" className="text-xs font-semibold">Parent Leave Template Period</Label>
                <Select value={typeTemplateId} onValueChange={(val) => setTypeTemplateId(val || "")} required>
                  <SelectTrigger id="type-template" className="w-full rounded-lg bg-zinc-50 dark:bg-zinc-900 border dark:border-zinc-800 text-sm">
                    <SelectValue placeholder="Select Parent Template">
                      {typeTemplateId ? (() => {
                        const match = templates.find(t => String(t.id) === typeTemplateId);
                        return match ? getTimelineDisplay(match.time_line) : undefined;
                      })() : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-zinc-950 border dark:border-zinc-800">
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={String(t.id)}>
                        {getTimelineDisplay(t.time_line)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center justify-between p-3 rounded-lg border dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
                  <div className="space-y-0.5 pr-2">
                    <Label htmlFor="is-paid" className="text-xs font-semibold">Paid Leave</Label>
                    <span className="text-[10px] text-muted-foreground block line-clamp-1">
                      Whether leave remains fully paid.
                    </span>
                  </div>
                  <Switch
                    id="is-paid"
                    checked={typeIsPaid}
                    onCheckedChange={setTypeIsPaid}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
                  <div className="space-y-0.5 pr-2">
                    <Label htmlFor="allow-encashment" className="text-xs font-semibold">Allow Encashment</Label>
                    <span className="text-[10px] text-muted-foreground block line-clamp-1">
                      Unused leaves can be encashed.
                    </span>
                  </div>
                  <Switch
                    id="allow-encashment"
                    checked={typeAllowEncashment}
                    onCheckedChange={setTypeAllowEncashment}
                  />
                </div>
              </div>

              <div className="space-y-2 p-3 rounded-lg border dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5 pr-2">
                    <Label htmlFor="carry-forward" className="text-xs font-semibold">Enable Carry Forward</Label>
                    <span className="text-[10px] text-muted-foreground block">
                      Whether unused leaves carry over to the next period.
                    </span>
                  </div>
                  <Switch
                    id="carry-forward"
                    checked={typeCarryForward}
                    onCheckedChange={setTypeCarryForward}
                  />
                </div>

                {typeCarryForward && (
                  <div className="space-y-1.5 pt-2 border-t dark:border-zinc-800">
                    <Label htmlFor="max-carry-forward" className="text-xs font-semibold">Max Carry Forward (Days)</Label>
                    <Input
                      id="max-carry-forward"
                      type="number"
                      min="0"
                      placeholder="0 = unlimited"
                      value={maxCarryForward}
                      onChange={(e) => setMaxCarryForward(Number(e.target.value))}
                      className="rounded-lg shadow-inner bg-zinc-50 dark:bg-zinc-900 border dark:border-zinc-800 text-sm"
                    />
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="px-6 py-3.5 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/60 backdrop-blur-xs shrink-0 flex items-center justify-end gap-3 mt-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsTypeDialogOpen(false)}
                className="rounded-lg border shadow-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isTypeSubmitting || !typeTemplateId}
                className="rounded-lg bg-primary hover:bg-primary/95 text-primary-foreground font-semibold shadow-sm hover:shadow-md transition-all flex items-center gap-2"
              >
                {isTypeSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Save Configuration
                    <Check className="h-4 w-4" />
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Custom Confirmation Dialog */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="max-w-xs bg-white dark:bg-zinc-950 border dark:border-zinc-800 shadow-2xl rounded-2xl p-6 text-center">
          <DialogHeader className="flex flex-col items-center">
            <div className="p-3 bg-rose-500/10 text-rose-600 rounded-full mb-3 dark:bg-rose-950/30">
              <AlertCircle className="h-6 w-6" />
            </div>
            <DialogTitle className="text-lg font-bold">
              {confirmTitle}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-2 max-w-xs mx-auto">
              {confirmDesc}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-5 flex items-center justify-center gap-3 border-t dark:border-zinc-800 mt-4 sm:justify-center">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsConfirmOpen(false)}
              className="rounded-lg border shadow-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (onConfirmAction) onConfirmAction();
                setIsConfirmOpen(false);
              }}
              className="rounded-lg bg-rose-600 hover:bg-rose-700 text-white hover:text-white font-semibold shadow-xs px-5"
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
