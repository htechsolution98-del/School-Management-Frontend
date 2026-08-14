"use client";

import { useEffect, useState } from "react";
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
  const [templateTimeline, setTemplateTimeline] = useState("");

  // Leave Type Modal Form state
  const [isTypeDialogOpen, setIsTypeDialogOpen] = useState(false);
  const [isTypeSubmitting, setIsTypeSubmitting] = useState(false);
  const [editingType, setEditingType] = useState<LeaveTypeRecord | null>(null);
  const [typeName, setTypeName] = useState("");
  const [typeTemplateId, setTypeTemplateId] = useState("");
  const [typeNum, setTypeNum] = useState<number>(0);
  const [typeCategoryIds, setTypeCategoryIds] = useState<number[]>([]);
  const [typeCarryForward, setTypeCarryForward] = useState(false);

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
      setTemplates(Array.isArray(templatesData) ? templatesData : []);
      setLeaveTypes(Array.isArray(typesData) ? typesData : []);
      setDbCategories(Array.isArray(catsData) ? catsData : []);
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
    setTemplateTimeline("MONTHLY");
    setIsTemplateDialogOpen(true);
  };

  const handleOpenEditTemplate = (tmpl: LeaveTemplate) => {
    setEditingTemplate(tmpl);
    setTemplateTimeline(tmpl.time_line);
    setIsTemplateDialogOpen(true);
  };

  const handleTemplateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateTimeline) return;
    setIsTemplateSubmitting(true);
    try {
      if (editingTemplate) {
        await updateLeaveTemplate(editingTemplate.id, templateTimeline);
        toast.success("Leave template updated successfully");
      } else {
        await createLeaveTemplate(templateTimeline);
        toast.success("Leave template created successfully");
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
          toast.success("Leave template deleted successfully");
          fetchData();
        } catch (err: any) {
          console.error(err);
          toast.error(err?.message || "Failed to delete leave template");
        } finally {
          setDeletingId(null);
        }
      }
    );
  };

  // ─── Leave Types CRUD Actions ──────────────────────────────────────────────

  const handleOpenCreateType = () => {
    setEditingType(null);
    setTypeName("");
    setTypeTemplateId(templates[0] ? String(templates[0].id) : "");
    setTypeNum(1);
    setTypeCategoryIds([]);
    setTypeCarryForward(false);
    setIsTypeDialogOpen(true);
  };

  const handleOpenEditType = (typeRec: LeaveTypeRecord) => {
    setEditingType(typeRec);
    setTypeName(typeRec.leave_type);
    setTypeTemplateId(String(typeRec.leave_template));
    setTypeNum(typeRec.leave_num);
    setTypeCategoryIds([typeRec.category]); // single category for edit mode
    setTypeCarryForward(typeRec.is_carry_forward);
    setIsTypeDialogOpen(true);
  };

  const handleTypeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typeName || !typeTemplateId || typeNum < 0) {
      toast.error("Please fill out all fields correctly.");
      return;
    }
    if (!editingType && typeCategoryIds.length === 0) {
      toast.error("Please select at least one staff category.");
      return;
    }
    setIsTypeSubmitting(true);

    try {
      if (editingType) {
        // Edit mode: single category (keep as-is)
        const payload = {
          leave_type: typeName.trim().toUpperCase(),
          leave_template: Number(typeTemplateId),
          leave_num: typeNum,
          category: typeCategoryIds[0] ?? editingType.category,
          is_carry_forward: typeCarryForward,
        };
        await updateLeaveType(editingType.id, payload);
        toast.success("Leave type updated successfully");
        setIsTypeDialogOpen(false);
        fetchData();
      } else {
        // Create mode: one record per selected category
        const results = await Promise.allSettled(
          typeCategoryIds.map((catId) =>
            createLeaveType({
              leave_type: typeName.trim().toUpperCase(),
              leave_template: Number(typeTemplateId),
              leave_num: typeNum,
              category: catId,
              is_carry_forward: typeCarryForward,
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
            leave_type: typeName,
            leave_template: first.leave_template,
            leave_num: first.leave_num,
            category: catId,
            is_carry_forward: first.is_carry_forward,
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

  const handleDeleteType = async (id: number) => {
    triggerConfirm(
      "Delete Leave Type?",
      "Are you sure you want to delete this leave type? This action cannot be undone.",
      async () => {
        setDeletingId(id);
        try {
          await deleteLeaveType(id);
          toast.success("Leave type deleted successfully");
          fetchData();
        } catch (err: any) {
          console.error(err);
          toast.error(err?.message || "Failed to delete leave type");
        } finally {
          setDeletingId(null);
        }
      }
    );
  };

  const getTimelineDisplay = (timeline: string) => {
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

  const formatRoleLabel = (rawName: string) => {
    if (!rawName) return "General Staff";
    const name = rawName.toUpperCase();
    if (name === "TEACHER") return "Teacher / Staff";
    if (name === "CLERK") return "Clerk";
    if (name === "PRINCIPAL") return "Principal";
    if (name === "LIBRARIAN") return "Librarian";
    if (name === "ALL_STAFF" || name === "ALL") return "All Staff";
    return rawName
      .split(" ")
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  };

  const getCategoryName = (catId?: number | null, recCategoryName?: string) => {
    if (recCategoryName) {
      return formatRoleLabel(recCategoryName);
    }
    if (catId != null) {
      const match = dbCategories.find((c) => Number(c.id) === Number(catId));
      if (match && match.feature_name) {
        return formatRoleLabel(match.feature_name);
      }
      const fallback: Record<number, string> = {
        1: "Clerk",
        2: "Teacher / Staff",
        3: "Principal",
        4: "Librarian",
        5: "Student",
      };
      if (fallback[catId]) return fallback[catId];
      return `Category ${catId}`;
    }
    return "All Staff / General";
  };

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto bg-linear-to-b from-zinc-50 to-zinc-100/30 dark:from-zinc-950 dark:to-zinc-900/30 min-h-screen">
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
                          <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wide">
                            Timeline Configuration
                          </CardTitle>
                          <CalendarDays className="h-4 w-4 text-primary/70" />
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <span className="text-2xl font-extrabold text-zinc-950 dark:text-zinc-50">
                              {getTimelineDisplay(tmpl.time_line)}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 pt-2 border-t dark:border-zinc-850 justify-end">
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => handleOpenEditTemplate(tmpl)}
                              className="flex items-center gap-1 hover:bg-zinc-50"
                            >
                              <Edit2 className="h-3 w-3" />
                              Edit
                            </Button>
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => handleDeleteTemplate(tmpl.id)}
                              disabled={deletingId === tmpl.id}
                              className="text-rose-600 hover:bg-rose-50 border-rose-250 flex items-center gap-1"
                            >
                              {deletingId === tmpl.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Trash2 className="h-3 w-3" />
                              )}
                              Delete
                            </Button>
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
                            <CardHeader className="pb-3 flex flex-row items-center justify-between">
                              <div className="space-y-1">
                                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                  Category Allocation
                                </span>
                                <CardTitle className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                                  {typeName}
                                </CardTitle>
                              </div>
                              <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-200/50">
                                Allowed: {first.leave_num} days
                              </Badge>
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
                                {(() => {
                                  const catNames = records.map((rec) => getCategoryName(rec.category, (rec as any).category_name));
                                  const isAllStaffGroup = catNames.every((n) => n === "All Staff" || n === "All Staff / General");
                                  const isExpanded = !!expandedGroups[typeName];

                                  if (isAllStaffGroup && records.length > 1) {
                                    return (
                                      <div className="space-y-1.5">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                          Staff Categories (All Staff)
                                        </span>

                                        <div className="flex flex-col gap-1.5">
                                          <div
                                            onClick={() => toggleExpandGroup(typeName)}
                                            className="flex items-center justify-between rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-3.5 py-2.5 cursor-pointer transition-all hover:bg-emerald-100/60 select-none"
                                          >
                                            <div className="flex items-center gap-2">
                                              <UserCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                                              <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                                                All Staff ({records.length} Categories)
                                              </span>
                                            </div>
                                            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-white dark:bg-zinc-800 border border-emerald-200/80 dark:border-emerald-700 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                                              {isExpanded ? "Hide Roles" : "View Included Roles"}{" "}
                                              <ChevronDown size={12} className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                                            </span>
                                          </div>

                                          {isExpanded && (
                                            <div className="pl-2 space-y-1.5 pt-1 animate-in fade-in duration-200">
                                              {records.map((rec, idx) => {
                                                const catMatch = dbCategories.find((c) => Number(c.id) === Number(rec.category));
                                                const label = catMatch
                                                  ? formatRoleLabel(catMatch.feature_name)
                                                  : dbCategories[idx]
                                                  ? formatRoleLabel(dbCategories[idx].feature_name)
                                                  : `Staff Role ${idx + 1}`;

                                                return (
                                                  <div
                                                    key={`rec-expanded-${rec.id || idx}-${idx}`}
                                                    className="flex items-center justify-between rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-700 px-3 py-1.5"
                                                  >
                                                    <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                                                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                                                      {label}
                                                    </span>
                                                    <div className="flex items-center gap-1 shrink-0">
                                                      <Button
                                                        size="xs"
                                                        variant="ghost"
                                                        onClick={() => handleOpenEditType(rec)}
                                                        className="h-6 w-6 p-0 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200"
                                                        title="Edit"
                                                      >
                                                        <Edit2 className="h-3 w-3" />
                                                      </Button>
                                                      <Button
                                                        size="xs"
                                                        variant="ghost"
                                                        onClick={() => handleDeleteType(rec.id)}
                                                        disabled={deletingId === rec.id}
                                                        className="h-6 w-6 p-0 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-40"
                                                        title="Delete"
                                                      >
                                                        {deletingId === rec.id ? (
                                                          <Loader2 className="h-3 w-3 animate-spin" />
                                                        ) : (
                                                          <Trash2 className="h-3 w-3" />
                                                        )}
                                                      </Button>
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  }

                                  return (
                                    <div className="space-y-1.5">
                                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                        Staff Categories ({records.length})
                                      </span>
                                      <div className="flex flex-col gap-1.5">
                                        {records.map((rec, idx) => (
                                          <div
                                            key={`rec-item-${rec.id || idx}-${idx}`}
                                            className="flex items-center justify-between rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700 px-3 py-1.5"
                                          >
                                            <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                                              <UserCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                                              {getCategoryName(rec.category, (rec as any).category_name)}
                                            </span>
                                            <div className="flex items-center gap-1 shrink-0">
                                              <Button
                                                size="xs"
                                                variant="ghost"
                                                onClick={() => handleOpenEditType(rec)}
                                                className="h-6 w-6 p-0 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200"
                                                title="Edit"
                                              >
                                                <Edit2 className="h-3 w-3" />
                                              </Button>
                                              <Button
                                                size="xs"
                                                variant="ghost"
                                                onClick={() => handleDeleteType(rec.id)}
                                                disabled={deletingId === rec.id}
                                                className="h-6 w-6 p-0 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-40"
                                                title="Delete"
                                              >
                                                {deletingId === rec.id ? (
                                                  <Loader2 className="h-3 w-3 animate-spin" />
                                                ) : (
                                                  <Trash2 className="h-3 w-3" />
                                                )}
                                              </Button>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })()}

                                {/* + Add Category button & inline panel */}
                                {(() => {
                                  const existingCatIds = records.map((r) => r.category);
                                  const availableCats = dbCategories.filter(
                                    (c: any) => !existingCatIds.includes(Number(c.id))
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
                                              {availableCats.map((cat: any, idx: number) => {
                                                const catNumId = Number(cat.id);
                                                const catName = getCategoryName(catNumId);
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
                                                          setAddCatSelectedIds((prev) => [...prev, catNumId]);
                                                        } else {
                                                          setAddCatSelectedIds((prev) => prev.filter((id) => id !== catNumId));
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
                              </div>
                            </CardContent>
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
        <DialogContent className="max-w-sm bg-white dark:bg-zinc-950 border dark:border-zinc-800 shadow-2xl rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Sliders className="h-5 w-5 text-primary" />
              {editingTemplate ? "Edit Template Period" : "Create Leave Template"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Define the period under which leave types will be configured.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleTemplateSubmit} className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <Label htmlFor="timeline" className="text-xs font-semibold">Timeline Period</Label>
              <Select value={templateTimeline} onValueChange={(val) => setTemplateTimeline(val || "")} required>
                <SelectTrigger id="timeline" className="w-full rounded-lg bg-zinc-50 dark:bg-zinc-900 border dark:border-zinc-800 text-sm">
                  <SelectValue placeholder="Select Timeline" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-zinc-950 border dark:border-zinc-800">
                  <SelectItem value="MONTHLY">MONTHLY (1 Month)</SelectItem>
                  <SelectItem value="QUARTERLY">QUARTERLY (4 Months)</SelectItem>
                  <SelectItem value="SEMI_ANNUAL">SEMI_ANNUAL (6 Months)</SelectItem>
                  <SelectItem value="ANNUAL">ANNUAL (1 Year)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-4 border-t dark:border-zinc-800 flex items-center gap-3">
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
        <DialogContent className="max-w-md bg-white dark:bg-zinc-950 border dark:border-zinc-800 shadow-2xl rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              {editingType ? "Edit Leave Category" : "Define Leave Type"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Define the category limits, applicability rules, and carry forward settings.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleTypeSubmit} className="space-y-4 pt-4">
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
                <Label htmlFor="type-cat" className="text-xs font-semibold">
                  {editingType ? "Staff Category" : "Staff Categories"}
                  {!editingType && typeCategoryIds.length > 0 && (
                    <span className="ml-2 text-[10px] font-normal text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                      {typeCategoryIds.length} selected
                    </span>
                  )}
                </Label>

                {editingType ? (
                  /* Edit mode: show current category as a read-only badge */
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-sm font-medium text-zinc-700">
                    <UserCheck className="h-4 w-4 text-primary shrink-0" />
                    {getCategoryName(editingType.category, (editingType as any).category_name)}
                    <span className="ml-auto text-[10px] text-muted-foreground italic">Cannot change</span>
                  </div>
                ) : (
                  /* Create mode: multi-select checkboxes */
                  <div className="rounded-lg border dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 divide-y dark:divide-zinc-800 max-h-48 overflow-y-auto">
                    {(() => {
                      const categoriesList = dbCategories.length > 0 ? dbCategories : [
                        { id: 1, feature_name: "TEACHER" },
                        { id: 2, feature_name: "CLERK" },
                        { id: 3, feature_name: "PRINCIPAL" },
                        { id: 4, feature_name: "LIBRARIAN" },
                        { id: 5, feature_name: "VICE PRINCIPAL" },
                        { id: 6, feature_name: "ASSISTANT CLERK" },
                        { id: 7, feature_name: "TRANSPORT" },
                      ];
                      const allCatNumIds = categoriesList.map((c: any) => Number(c.id));
                      const isAllSelected = categoriesList.length > 0 && allCatNumIds.every((id: number) => typeCategoryIds.includes(id));

                      return (
                        <>
                          {/* Select All Roles Option */}
                          <label
                            className={`flex items-center justify-between px-3 py-2 cursor-pointer transition-colors text-xs font-bold border-b border-zinc-200 dark:border-zinc-800 select-none ${
                              isAllSelected
                                ? "bg-primary/10 text-primary"
                                : "bg-zinc-100/90 dark:bg-zinc-800/90 hover:bg-zinc-200/80 text-zinc-800 dark:text-zinc-200"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded accent-primary cursor-pointer"
                                checked={isAllSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setTypeCategoryIds(allCatNumIds);
                                  } else {
                                    setTypeCategoryIds([]);
                                  }
                                }}
                              />
                              <span>Select All Roles</span>
                            </div>
                            <span className="text-[10px] font-normal text-muted-foreground">
                              ({typeCategoryIds.length}/{categoriesList.length})
                            </span>
                          </label>

                          {categoriesList.map((cat: any, idx: number) => {
                            const name = (cat.feature_name || "").toUpperCase();
                            let label = cat.feature_name.charAt(0).toUpperCase() + cat.feature_name.slice(1).toLowerCase();
                            if (name === "TEACHER") label = "Teacher / Staff";
                            if (name === "CLERK") label = "Clerk";
                            if (name === "PRINCIPAL") label = "Principal";
                            if (name === "LIBRARIAN") label = "Librarian";
                            // For multi-word names (e.g. "Fees management"), capitalize each word
                            if (!["TEACHER","CLERK","PRINCIPAL","LIBRARIAN"].includes(name)) {
                              label = cat.feature_name
                                .split(" ")
                                .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                                .join(" ");
                            }
                            // id comes as string/num from API — cast to Number for comparison
                            const catNumId = Number(cat.id);
                            const isChecked = typeCategoryIds.includes(catNumId);
                            return (
                              <label
                                key={`cat-option-${cat.id || idx}-${idx}`}
                                htmlFor={`cat-${cat.id || idx}-${idx}`}
                                className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors text-sm select-none ${
                                  isChecked
                                    ? "bg-primary/8 dark:bg-primary/20 text-primary font-medium"
                                    : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                                }`}
                              >
                                <input
                                  id={`cat-${cat.id}`}
                                  type="checkbox"
                                  className="h-4 w-4 rounded accent-primary cursor-pointer"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setTypeCategoryIds((prev) => [...prev, catNumId]);
                                    } else {
                                      setTypeCategoryIds((prev) => prev.filter((id) => id !== catNumId));
                                    }
                                  }}
                                />
                                {label}
                              </label>
                            );
                          })}
                        </>
                      );
                    })()}
                  </div>
                )}
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

            <div className="flex items-center justify-between p-3 rounded-lg border dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
              <div className="space-y-0.5">
                <Label htmlFor="carry-forward" className="text-xs font-semibold">Enable Carry Forward</Label>
                <span className="text-[10px] text-muted-foreground block">
                  Whether unused leaves in this category carry over to the next period.
                </span>
              </div>
              <Switch
                id="carry-forward"
                checked={typeCarryForward}
                onCheckedChange={setTypeCarryForward}
              />
            </div>

            <DialogFooter className="pt-4 border-t dark:border-zinc-800 flex items-center gap-3">
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
              className="rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-xs px-5"
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
