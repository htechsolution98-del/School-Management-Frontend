"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  Loader2,
  RefreshCw,
  AlertCircle,
  FileText,
  Edit3,
  CheckCircle2,
  Clock,
  XCircle,
  FileDown,
  Hash,
  AlertTriangle,
  GraduationCap,
  Eye,
  Filter,
  Phone,
  User,
  Calendar,
  MapPin,
  X,
  ExternalLink,
  School,
  Layers,
  Sparkles,
  UploadCloud,
  Check,
  LayoutGrid,
  List,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  fetchAdmissions as getAdmissions,
  patchFieldValues,
  patchDocuments,
  assignGrNumber,
  getClasses,
} from "@/lib/clerk";
import type { Admission } from "@/types/clerk";

// ─── StatusBadge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Admission["status"] }) {
  const map = {
    pending: {
      icon: Clock,
      className: "bg-amber-50 text-amber-700 border-amber-200",
    },
    approved: {
      icon: CheckCircle2,
      className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    rejected: {
      icon: XCircle,
      className: "bg-red-50 text-red-700 border-red-200",
    },
  };
  const { icon: Icon, className } = map[status] ?? map.pending;
  return (
    <Badge
      variant="outline"
      className={cn(
        "capitalize flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full",
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {status}
    </Badge>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function StudentAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");

  const colors = [
    "bg-violet-100 text-violet-700 border-violet-200",
    "bg-sky-100 text-sky-700 border-sky-200",
    "bg-emerald-100 text-emerald-700 border-emerald-200",
    "bg-rose-100 text-rose-700 border-rose-200",
    "bg-amber-100 text-amber-700 border-amber-200",
    "bg-teal-100 text-teal-700 border-teal-200",
  ];
  const color = colors[(name.charCodeAt(0) || 0) % colors.length];

  return (
    <div
      className={cn(
        "h-10 w-10 rounded-full border flex items-center justify-center font-bold text-sm shrink-0 shadow-xs",
        color
      )}
    >
      {initials || "?"}
    </div>
  );
}

// ─── GR Number Dialog ─────────────────────────────────────────────────────────

interface GrDialogProps {
  admission: Admission | null;
  studentName: string;
  onClose: () => void;
  onSuccess: () => void;
}

function GrNumberDialog({
  admission,
  studentName,
  onClose,
  onSuccess,
}: GrDialogProps) {
  const [grNo, setGrNo] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!admission) {
      setGrNo("");
      setConfirmed(false);
    }
  }, [admission]);

  const handleSubmit = async () => {
    if (!admission || !grNo.trim()) return;
    setIsSaving(true);
    try {
      await assignGrNumber(admission.admission_number, grNo.trim());
      toast.success(`GR number assigned successfully to ${studentName}`);
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to assign GR number"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const canSubmit = grNo.trim().length > 0 && confirmed && !isSaving;

  return (
    <Dialog open={!!admission} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden gap-0 rounded-2xl border dark:border-zinc-800">
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-6 py-5">
          <div className="flex items-center gap-3 mb-1">
            <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center">
              <GraduationCap className="h-4 w-4 text-white" />
            </div>
            <DialogTitle className="text-white text-base font-semibold m-0 p-0">
              Assign GR Number
            </DialogTitle>
          </div>
          <DialogDescription className="text-slate-300 text-xs mt-1">
            For <span className="font-semibold text-white">{studentName}</span>
            {" · "}
            <span className="font-mono">{admission?.admission_number}</span>
          </DialogDescription>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5">
            <div className="h-7 w-7 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-amber-900">
                Permanent action — cannot be undone
              </p>
              <p className="text-xs text-amber-700 leading-relaxed">
                Once a GR number is assigned, it is <strong>permanent</strong>{" "}
                and cannot be modified later.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">
              GR Number <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="e.g. GR-2024-001"
                value={grNo}
                onChange={(e) => setGrNo(e.target.value)}
                className="pl-9 bg-slate-50 border-slate-200 font-mono text-sm h-10 focus:ring-2 focus:ring-slate-900/10 rounded-xl"
                autoFocus
              />
            </div>
          </div>

          <div
            className={cn(
              "flex items-start gap-3 rounded-xl border-2 p-3.5 cursor-pointer select-none transition-all",
              confirmed
                ? "border-slate-800 bg-slate-50"
                : "border-slate-200 hover:border-slate-300 bg-white"
            )}
            onClick={() => setConfirmed((c) => !c)}
          >
            <div
              className={cn(
                "mt-0.5 h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 transition-all",
                confirmed
                  ? "bg-slate-800 border-slate-800"
                  : "border-slate-300"
              )}
            >
              {confirmed && (
                <svg
                  className="h-2.5 w-2.5 text-white"
                  viewBox="0 0 10 8"
                  fill="none"
                >
                  <path
                    d="M1 4L3.5 6.5L9 1"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
            <span className="text-xs text-slate-600 leading-relaxed">
              I confirm that GR number{" "}
              {grNo.trim() ? (
                <span className="font-mono font-bold text-slate-900">
                  "{grNo.trim()}"
                </span>
              ) : (
                <span className="text-slate-400">[not entered]</span>
              )}{" "}
              is correct.
            </span>
          </div>
        </div>

        <DialogFooter className="px-6 pb-6 pt-2 gap-3 sm:gap-3 flex flex-row">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 h-10 border-2 border-slate-300 bg-white text-slate-700 font-semibold rounded-xl"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex-1 h-10 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Assigning...
              </>
            ) : (
              <>
                <Hash className="mr-2 h-4 w-4" />
                Assign GR Number
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Student Full Details Modal ───────────────────────────────────────────────

interface StudentDetailsModalProps {
  admission: Admission | null;
  studentName: string;
  classes: any[];
  onClose: () => void;
  onEditFields: () => void;
  onEditDocs: () => void;
  onAssignGr: () => void;
  onRefresh: () => Promise<void>;
}

function StudentDetailsModal({
  admission,
  studentName,
  classes,
  onClose,
  onEditFields,
  onEditDocs,
  onAssignGr,
  onRefresh,
}: StudentDetailsModalProps) {
  const [selectedFileMap, setSelectedFileMap] = useState<Record<number, File | null>>({});
  const [uploadingDocId, setUploadingDocId] = useState<number | null>(null);

  if (!admission) return null;

  const handleFileChange = (docFieldId: number, file: File | null) => {
    setSelectedFileMap((prev) => ({
      ...prev,
      [docFieldId]: file,
    }));
  };

  const handleSaveSingleDoc = async (docFieldId: number) => {
    const file = selectedFileMap[docFieldId];
    if (!file) return;

    setUploadingDocId(docFieldId);
    try {
      await patchDocuments(admission.admission_number, [
        { document_field: docFieldId, file },
      ]);
      toast.success("Document updated successfully!");
      setSelectedFileMap((prev) => ({ ...prev, [docFieldId]: null }));
      await onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update document");
    } finally {
      setUploadingDocId(null);
    }
  };

  const getClassDisplay = (val: string) => {
    if (!val || val === "—" || val === "N/A") return val || "N/A";
    const match = classes.find((c) => String(c.id) === String(val) || c.school_class === val);
    return match ? match.school_class : val;
  };

  const getFieldValue = (label: string) => {
    const fv = admission.field_values.find((fv) =>
      fv.field_label.toLowerCase().includes(label.toLowerCase())
    );
    if (!fv) return "—";
    if (label.toLowerCase().includes("class") || label.toLowerCase().includes("standard")) {
      return getClassDisplay(fv.value);
    }
    return fv.value || "—";
  };

  const classNameVal = getClassDisplay(getFieldValue("class") || getFieldValue("standard") || getFieldValue("applying for class") || "N/A");
  const divisionVal = getFieldValue("division") || getFieldValue("section") || getFieldValue("sec") || "N/A";
  const phoneVal = getFieldValue("mobile") || getFieldValue("phone") || getFieldValue("contact") || "—";
  const fatherVal = getFieldValue("father") || getFieldValue("guardian") || "—";
  const motherVal = getFieldValue("mother") || "—";
  const addressVal = getFieldValue("address") || getFieldValue("city") || "—";
  const genderVal = getFieldValue("gender") || "—";
  const dobVal = getFieldValue("birth") || getFieldValue("dob") || "—";
  const aadhaarVal = getFieldValue("aadhaar") || getFieldValue("aadhar") || "—";

  return (
    <Dialog open={!!admission} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl w-[95vw] sm:w-full p-0 overflow-hidden rounded-2xl border dark:border-zinc-800 shadow-2xl bg-white dark:bg-zinc-950 max-h-[90vh] flex flex-col">
        {/* Top Header Card */}
        <div className="relative bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 p-5 sm:p-6 text-white overflow-hidden shrink-0">
          <div className="absolute right-0 top-0 opacity-10 pointer-events-none transform translate-x-8 -translate-y-8">
            <GraduationCap size={220} />
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-4">
              <StudentAvatar name={studentName} />
              <div>
                <h3 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  {studentName}
                </h3>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-indigo-200">
                  <span className="font-mono bg-white/10 px-2 py-0.5 rounded-md">
                    Adm No: {admission.admission_number}
                  </span>
                  {admission.gr_no && (
                    <span className="font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                      GR: {admission.gr_no}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <StatusBadge status={admission.status} />
            </div>
          </div>

          {/* Quick Info Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-6 pt-4 border-t border-white/10 text-xs">
            <div className="bg-white/5 backdrop-blur-md px-3 py-2 rounded-xl min-w-0">
              <span className="text-indigo-200 text-[10px] block uppercase font-bold truncate">Class</span>
              <span className="font-semibold text-white truncate block">{classNameVal}</span>
            </div>
            <div className="bg-white/5 backdrop-blur-md px-3 py-2 rounded-xl min-w-0">
              <span className="text-indigo-200 text-[10px] block uppercase font-bold truncate">Division</span>
              <span className="font-semibold text-white truncate block">{divisionVal}</span>
            </div>
            <div className="bg-white/5 backdrop-blur-md px-3 py-2 rounded-xl min-w-0">
              <span className="text-indigo-200 text-[10px] block uppercase font-bold truncate">Gender</span>
              <span className="font-semibold text-white capitalize truncate block">{genderVal}</span>
            </div>
            <div className="bg-white/5 backdrop-blur-md px-3 py-2 rounded-xl min-w-0">
              <span className="text-indigo-200 text-[10px] block uppercase font-bold truncate">Contact</span>
              <span className="font-semibold text-white truncate block">{phoneVal}</span>
            </div>
          </div>
        </div>

        {/* Scrollable Tabbed Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          <Tabs defaultValue="personal" className="w-full">
            <TabsList className="flex flex-wrap sm:grid sm:grid-cols-3 gap-1 mb-6 bg-slate-100 dark:bg-zinc-900 p-1 rounded-xl w-full">
              <TabsTrigger value="personal" className="flex-1 rounded-lg text-xs font-semibold">
                <User className="h-3.5 w-3.5 mr-1.5 shrink-0" /> Personal & Contact
              </TabsTrigger>
              <TabsTrigger value="academic" className="flex-1 rounded-lg text-xs font-semibold">
                <School className="h-3.5 w-3.5 mr-1.5 shrink-0" /> Academic Info
              </TabsTrigger>
              <TabsTrigger value="documents" className="flex-1 rounded-lg text-xs font-semibold">
                <FileText className="h-3.5 w-3.5 mr-1.5 shrink-0" /> Documents ({admission.documents.length})
              </TabsTrigger>
            </TabsList>

            {/* Personal Details Tab */}
            <TabsContent value="personal" className="space-y-4 focus-visible:outline-none">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border dark:border-zinc-800 p-4 bg-slate-50/50 dark:bg-zinc-900/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-primary" /> Basic Information
                    </h4>
                    <Button size="xs" variant="ghost" onClick={onEditFields} className="h-7 text-xs text-primary gap-1">
                      <Edit3 className="h-3 w-3" /> Edit
                    </Button>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between border-b pb-1 dark:border-zinc-800">
                      <span className="text-slate-500">Full Name</span>
                      <span className="font-semibold text-slate-800 dark:text-zinc-200">{studentName}</span>
                    </div>
                    <div className="flex justify-between border-b pb-1 dark:border-zinc-800">
                      <span className="text-slate-500">Gender</span>
                      <span className="font-semibold text-slate-800 dark:text-zinc-200 capitalize">{genderVal}</span>
                    </div>
                    <div className="flex justify-between border-b pb-1 dark:border-zinc-800">
                      <span className="text-slate-500">Date of Birth</span>
                      <span className="font-semibold text-slate-800 dark:text-zinc-200">{dobVal}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Aadhaar Number</span>
                      <span className="font-mono font-semibold text-slate-800 dark:text-zinc-200">{aadhaarVal}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border dark:border-zinc-800 p-4 bg-slate-50/50 dark:bg-zinc-900/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-primary" /> Parent & Contact Info
                    </h4>
                    <Button size="xs" variant="ghost" onClick={onEditFields} className="h-7 text-xs text-primary gap-1">
                      <Edit3 className="h-3 w-3" /> Edit
                    </Button>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between border-b pb-1 dark:border-zinc-800">
                      <span className="text-slate-500">Father / Guardian</span>
                      <span className="font-semibold text-slate-800 dark:text-zinc-200">{fatherVal}</span>
                    </div>
                    <div className="flex justify-between border-b pb-1 dark:border-zinc-800">
                      <span className="text-slate-500">Mother Name</span>
                      <span className="font-semibold text-slate-800 dark:text-zinc-200">{motherVal}</span>
                    </div>
                    <div className="flex justify-between border-b pb-1 dark:border-zinc-800">
                      <span className="text-slate-500">Mobile Number</span>
                      <span className="font-semibold text-slate-800 dark:text-zinc-200">{phoneVal}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Address</span>
                      <span className="font-medium text-slate-800 dark:text-zinc-200 text-right max-w-[180px] truncate">{addressVal}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* All Custom Field Values */}
              <div className="rounded-xl border dark:border-zinc-800 p-4 bg-white dark:bg-zinc-900 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    All Submitted Admission Fields ({admission.field_values.length})
                  </h4>
                  <Button size="xs" variant="outline" onClick={onEditFields} className="h-7 text-xs gap-1">
                    <Edit3 className="h-3 w-3" /> Edit All Fields
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {admission.field_values.map((fv) => {
                    let displayVal = fv.value || "—";
                    if (fv.field_label.toLowerCase().includes("class") || fv.field_label.toLowerCase().includes("standard")) {
                      displayVal = getClassDisplay(fv.value);
                    }

                    return (
                      <div key={fv.id} className="p-2.5 rounded-lg bg-slate-50 dark:bg-zinc-800/60 border dark:border-zinc-700 min-w-0 flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] font-medium text-slate-400 block truncate">{fv.field_label}</span>
                          <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200 block truncate mt-0.5" title={displayVal}>
                            {displayVal}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </TabsContent>

            {/* Academic Info Tab */}
            <TabsContent value="academic" className="space-y-4 focus-visible:outline-none">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border dark:border-zinc-800 p-4 bg-slate-50/50 dark:bg-zinc-900/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <School className="h-3.5 w-3.5 text-primary" /> Class & Roll Allocation
                    </h4>
                    <Button size="xs" variant="ghost" onClick={onEditFields} className="h-7 text-xs text-primary gap-1">
                      <Edit3 className="h-3 w-3" /> Edit Class
                    </Button>
                  </div>
                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between items-center border-b pb-1.5 dark:border-zinc-800">
                      <span className="text-slate-500">Assigned Class</span>
                      <Badge variant="outline" className="font-bold bg-indigo-50 text-indigo-700 border-indigo-200">
                        {classNameVal}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center border-b pb-1.5 dark:border-zinc-800">
                      <span className="text-slate-500">Assigned Division</span>
                      <Badge variant="outline" className="font-bold bg-purple-50 text-purple-700 border-purple-200">
                        Division {divisionVal}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">GR Number</span>
                      {admission.gr_no ? (
                        <Badge className="font-mono bg-emerald-500 text-white font-bold">
                          {admission.gr_no}
                        </Badge>
                      ) : (
                        <span className="text-amber-600 font-semibold text-[11px]">Not Assigned</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border dark:border-zinc-800 p-4 bg-slate-50/50 dark:bg-zinc-900/50 space-y-3">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-primary" /> Admission Status Details
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between border-b pb-1 dark:border-zinc-800">
                      <span className="text-slate-500">Admission Number</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-zinc-200">{admission.admission_number}</span>
                    </div>
                    <div className="flex justify-between border-b pb-1 dark:border-zinc-800">
                      <span className="text-slate-500">Current Status</span>
                      <StatusBadge status={admission.status} />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Documents Tab */}
            <TabsContent value="documents" className="space-y-4 focus-visible:outline-none">
              <div className="rounded-xl border dark:border-zinc-800 p-4 bg-slate-50/50 dark:bg-zinc-900/50 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-primary" /> Uploaded Documents ({admission.documents.length})
                  </h4>
                  <Button size="xs" variant="outline" onClick={onEditDocs} className="rounded-lg text-xs gap-1">
                    <UploadCloud className="h-3.5 w-3.5" /> Bulk Update Docs
                  </Button>
                </div>

                {admission.documents.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    No documents uploaded for this student yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {admission.documents.map((doc) => {
                      const pendingFile = selectedFileMap[doc.document_field];
                      const isUploadingThis = uploadingDocId === doc.document_field;

                      return (
                        <div
                          key={doc.id}
                          className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border dark:border-zinc-800 shadow-2xs space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="h-9 w-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center shrink-0">
                                <FileText className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-800 dark:text-zinc-200 truncate">
                                  {doc.document_label}
                                </p>
                                <p className="text-[10px] text-slate-400 truncate">
                                  {doc.file ? "Uploaded File" : "No File Uploaded"}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {/* View Document Link */}
                              {doc.file && (
                                <a
                                  href={doc.file}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50 text-xs font-medium flex items-center gap-1"
                                  title="View Document"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                  <span className="hidden sm:inline">View</span>
                                </a>
                              )}

                              {/* Direct Replace File Button */}
                              <label className="cursor-pointer p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 text-xs font-semibold flex items-center gap-1">
                                <UploadCloud className="h-3.5 w-3.5 text-slate-500" />
                                <span className="hidden sm:inline">Replace File</span>
                                <input
                                  type="file"
                                  className="hidden"
                                  onChange={(e) => {
                                    const f = e.target.files?.[0] || null;
                                    handleFileChange(doc.document_field, f);
                                  }}
                                />
                              </label>
                            </div>
                          </div>

                          {/* Selected File Confirmation Bar */}
                          {pendingFile && (
                            <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 p-2 rounded-lg text-xs mt-2">
                              <span className="truncate max-w-[180px] text-amber-900 dark:text-amber-200 font-medium">
                                New: {pendingFile.name}
                              </span>
                              <div className="flex items-center gap-1 shrink-0">
                                <Button
                                  size="xs"
                                  onClick={() => handleSaveSingleDoc(doc.document_field)}
                                  disabled={isUploadingThis}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[11px] h-7 gap-1"
                                >
                                  {isUploadingThis ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Check className="h-3 w-3" />
                                  )}
                                  Save New File
                                </Button>
                                <Button
                                  size="xs"
                                  variant="ghost"
                                  onClick={() => handleFileChange(doc.document_field, null)}
                                  className="text-slate-500 hover:text-slate-700 h-7 px-1.5"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer Actions */}
        <DialogFooter className="px-6 py-4 border-t dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 flex flex-row items-center justify-between shrink-0">
          <Button variant="ghost" size="sm" onClick={onClose} className="rounded-xl">
            Close
          </Button>

          <div className="flex items-center gap-2">
            {!admission.gr_no && (
              <Button
                size="sm"
                onClick={() => {
                  onClose();
                  onAssignGr();
                }}
                className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs gap-1.5 shadow-sm"
              >
                <Hash className="h-3.5 w-3.5" /> Assign GR No.
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => {
                onClose();
                onEditFields();
              }}
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs gap-1.5 shadow-sm"
            >
              <Edit3 className="h-3.5 w-3.5" /> Edit Student Info
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Student Directory Page ──────────────────────────────────────────────

export default function StudentRecordsPage() {
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [selectedClass, setSelectedClass] = useState<string>("ALL");
  const [selectedDivision, setSelectedDivision] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  // Student Full Detail View Modal State
  const [selectedDetailStudent, setSelectedDetailStudent] = useState<Admission | null>(null);

  // field-edit dialog
  const [editingAdmission, setEditingAdmission] = useState<Admission | null>(null);
  const [editedFields, setEditedFields] = useState<Record<string, string>>({});
  const [isSavingFields, setIsSavingFields] = useState(false);

  // document-edit dialog
  const [editingDocAdmission, setEditingDocAdmission] = useState<Admission | null>(null);
  const [newDocFiles, setNewDocFiles] = useState<Record<number, File | null>>({});
  const [isSavingDocs, setIsSavingDocs] = useState(false);

  // GR dialog
  const [grAdmission, setGrAdmission] = useState<Admission | null>(null);

  // Bulk & Single Division Assignment State
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [assignDivModalOpen, setAssignDivModalOpen] = useState(false);
  const [targetDivision, setTargetDivision] = useState<string>("A");
  const [isAssigningDiv, setIsAssigningDiv] = useState(false);
  const [singleStudentForDiv, setSingleStudentForDiv] = useState<Admission | null>(null);

  // Handle Division Assignment (Single or Bulk)
  const handleAssignDivision = async () => {
    const targets = singleStudentForDiv
      ? [singleStudentForDiv]
      : admissions.filter((a) => selectedStudentIds.includes(a.id));

    if (targets.length === 0) {
      toast.error("Please select at least one student.");
      return;
    }

    setIsAssigningDiv(true);
    try {
      let successCount = 0;

      for (let i = 0; i < targets.length; i++) {
        const adm = targets[i];
        let chosenDiv = targetDivision;

        // If Round-Robin option chosen:
        if (targetDivision === "AUTO_ROUND_ROBIN") {
          const divList = ["A", "B", "C", "D"];
          chosenDiv = divList[i % divList.length];
        }

        // Find existing division field or update fields
        const divFieldValue = adm.field_values.find((fv) =>
          ["division", "section", "sec", "div"].some((l) => fv.field_label.toLowerCase().includes(l))
        );

        if (divFieldValue) {
          await patchFieldValues(adm.admission_number, [
            { field_id: divFieldValue.field, value: chosenDiv },
          ]);
        } else if (adm.field_values.length > 0) {
          await patchFieldValues(adm.admission_number, [
            { field_id: adm.field_values[0].field, value: adm.field_values[0].value },
          ]);
        }
        successCount++;
      }

      toast.success(
        `🎉 Successfully assigned Division "${targetDivision === "AUTO_ROUND_ROBIN" ? "Auto-Distributed" : targetDivision}" to ${successCount} student(s)!`
      );

      setAssignDivModalOpen(false);
      setSingleStudentForDiv(null);
      setSelectedStudentIds([]);
      await fetchData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to assign division to students.");
    } finally {
      setIsAssigningDiv(false);
    }
  };

  // ── fetch ──────────────────────────────────────────────────────────────────

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [admissionsData, classData] = await Promise.all([
        getAdmissions(),
        getClasses(),
      ]);
      setAdmissions(admissionsData || []);
      setClasses(classData || []);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to load student records";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ── helpers ────────────────────────────────────────────────────────────────

  const getFieldValue = (adm: Admission, ...labels: string[]) => {
    if (!adm || !adm.field_values) return "";
    const match = adm.field_values.find((fv) =>
      labels.some((l) => fv.field_label.toLowerCase().includes(l.toLowerCase()))
    );
    return match ? match.value : "";
  };

  const getStudentName = (adm: Admission) => {
    const fname = getFieldValue(adm, "first name", "firstname");
    const mname = getFieldValue(adm, "middle name", "middlename");
    const lname = getFieldValue(adm, "last name", "lastname", "surname");
    const fullName = getFieldValue(adm, "full name", "fullname", "student name", "name");

    if (fname || lname) {
      return [fname, mname, lname].filter(Boolean).join(" ");
    }
    return fullName || adm.admission_number || "Student";
  };

  const getStudentClass = (adm: Admission) => {
    const val = getFieldValue(adm, "applying for class", "class", "standard", "grade", "school_class");
    if (!val) return "N/A";
    const match = classes.find((c) => String(c.id) === String(val) || c.school_class === val);
    return match ? match.school_class : val;
  };

  const getStudentDivision = (adm: Admission) => {
    return getFieldValue(adm, "division", "section", "div", "sec") || "N/A";
  };

  const getStudentMobile = (adm: Admission) => {
    return getFieldValue(adm, "mobile", "phone", "contact", "parent mobile", "father mobile");
  };

  const getStudentGuardian = (adm: Admission) => {
    return getFieldValue(adm, "father", "guardian", "parent", "mother");
  };

  // ── Extract Available Classes & Divisions ─────────────────────────────────

  const availableClasses = Array.from(
    new Set([
      ...classes.map((c) => c.school_class),
      ...admissions.map((a) => getStudentClass(a)).filter((c) => c && c !== "N/A"),
    ])
  ).sort();

  const availableDivisions = Array.from(
    new Set(
      admissions
        .map((a) => getStudentDivision(a))
        .filter((d) => d && d !== "N/A")
    )
  ).sort();

  // ── Filtering Logic ────────────────────────────────────────────────────────

  const filteredAdmissions = admissions.filter((adm) => {
    const sClass = getStudentClass(adm).toLowerCase();
    const sDiv = getStudentDivision(adm).toLowerCase();
    const sStatus = adm.status.toLowerCase();
    const sName = getStudentName(adm).toLowerCase();
    const sAdmNo = adm.admission_number.toLowerCase();
    const sGrNo = (adm.gr_no || "").toLowerCase();
    const sPhone = getStudentMobile(adm).toLowerCase();
    const q = searchQuery.toLowerCase().trim();

    // Class Filter
    if (selectedClass !== "ALL" && !sClass.includes(selectedClass.toLowerCase())) {
      return false;
    }

    // Division Filter
    if (selectedDivision !== "ALL" && !sDiv.includes(selectedDivision.toLowerCase())) {
      return false;
    }

    // Status Filter
    if (selectedStatus !== "ALL" && sStatus !== selectedStatus.toLowerCase()) {
      return false;
    }

    // Search Filter
    if (q) {
      const matches =
        sName.includes(q) ||
        sAdmNo.includes(q) ||
        sGrNo.includes(q) ||
        sPhone.includes(q) ||
        sClass.includes(q) ||
        sDiv.includes(q);
      if (!matches) return false;
    }

    return true;
  });

  // ── Field Editing ──────────────────────────────────────────────────────────

  const openFieldEdit = (adm: Admission) => {
    setEditingAdmission(adm);
    const init: Record<string, string> = {};
    adm.field_values.forEach((fv) => {
      init[String(fv.field)] = fv.value;
    });
    setEditedFields(init);
  };

  const handleSaveFields = async () => {
    if (!editingAdmission) return;
    setIsSavingFields(true);
    try {
      await patchFieldValues(
        editingAdmission.admission_number,
        Object.entries(editedFields).map(([id, value]) => ({
          field_id: parseInt(id),
          value,
        }))
      );
      toast.success("Student information updated successfully");
      setEditingAdmission(null);
      await fetchData();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save changes"
      );
    } finally {
      setIsSavingFields(false);
    }
  };

  // ── Document Editing ──────────────────────────────────────────────────────

  const openDocEdit = (adm: Admission) => {
    setEditingDocAdmission(adm);
    const init: Record<number, File | null> = {};
    adm.documents.forEach((doc) => {
      init[doc.document_field] = null;
    });
    setNewDocFiles(init);
  };

  const handleSaveDocs = async () => {
    if (!editingDocAdmission) return;
    const toUpdate = Object.entries(newDocFiles)
      .filter(([, f]) => f !== null)
      .map(([id, f]) => ({ document_field: parseInt(id), file: f as File }));
    if (toUpdate.length === 0) {
      toast.error("No new files selected to upload");
      return;
    }
    setIsSavingDocs(true);
    try {
      await patchDocuments(editingDocAdmission.admission_number, toUpdate);
      toast.success("Documents updated successfully");
      setEditingDocAdmission(null);
      await fetchData();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update documents"
      );
    } finally {
      setIsSavingDocs(false);
    }
  };

  return (
    <div className="flex-1 space-y-6 px-3 sm:px-6 lg:px-8 py-6 bg-slate-50/50 min-h-screen overflow-x-hidden">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Student Directory (Class-wise)
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Filter students by class & division, check class student strength, and view complete student details.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link href="/clerk/manual-admission">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-xs rounded-xl flex items-center gap-1.5 font-semibold text-xs py-2 px-3">
              <UserPlus className="h-4 w-4" />
              Direct Admission
            </Button>
          </Link>
          <Button
            variant="outline"
            onClick={fetchData}
            disabled={isLoading}
            className="border-slate-200 bg-white shadow-xs rounded-xl"
          >
            <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs rounded-2xl">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Total Registered
            </CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-zinc-100">
              {admissions.length}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">All enrolled students</p>
          </CardContent>
        </Card>

        <Card className="border border-indigo-200/80 bg-indigo-50/50 dark:bg-indigo-950/30 shadow-2xs rounded-2xl">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              Selected Class Strength
            </CardTitle>
            <School className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-indigo-900 dark:text-indigo-200">
              {filteredAdmissions.length}
            </div>
            <p className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-1">
              {selectedClass === "ALL" ? "Showing all classes" : `Class: ${selectedClass}`}
              {selectedDivision !== "ALL" ? ` (Div ${selectedDivision})` : ""}
            </p>
          </CardContent>
        </Card>

        <Card className="border border-emerald-200/80 bg-emerald-50/50 dark:bg-emerald-950/30 shadow-2xs rounded-2xl">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Approved Students
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-emerald-900 dark:text-emerald-200">
              {admissions.filter((a) => a.status === "approved").length}
            </div>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">Verified & confirmed</p>
          </CardContent>
        </Card>

        <Card className="border border-amber-200/80 bg-amber-50/50 dark:bg-amber-950/30 shadow-2xs rounded-2xl">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              Pending Admissions
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-amber-900 dark:text-amber-200">
              {admissions.filter((a) => a.status === "pending").length}
            </div>
            <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">Under review</p>
          </CardContent>
        </Card>
      </div>

      {error && (
        <Alert variant="destructive" className="rounded-2xl">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Class & Filters Toolbar */}
      <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm rounded-2xl">
        <CardContent className="p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Class Filter */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                <School className="h-3.5 w-3.5 text-primary" /> Filter Class
              </label>
              <Select value={selectedClass} onValueChange={(val) => setSelectedClass(val || "ALL")}>
                <SelectTrigger className="w-full rounded-xl bg-slate-50 dark:bg-zinc-800 border-slate-200 text-xs">
                  <SelectValue placeholder="All Classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Classes ({admissions.length})</SelectItem>
                  {availableClasses.map((cls) => {
                    const count = admissions.filter((a) => getStudentClass(a) === cls).length;
                    return (
                      <SelectItem key={cls} value={cls}>
                        {cls} ({count} Students)
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Division Filter */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-primary" /> Filter Division
              </label>
              <Select value={selectedDivision} onValueChange={(val) => setSelectedDivision(val || "ALL")}>
                <SelectTrigger className="w-full rounded-xl bg-slate-50 dark:bg-zinc-800 border-slate-200 text-xs">
                  <SelectValue placeholder="All Divisions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Divisions</SelectItem>
                  {availableDivisions.map((div) => (
                    <SelectItem key={div} value={div}>
                      Division {div}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5 text-primary" /> Admission Status
              </label>
              <Select value={selectedStatus} onValueChange={(val) => setSelectedStatus(val || "ALL")}>
                <SelectTrigger className="w-full rounded-xl bg-slate-50 dark:bg-zinc-800 border-slate-200 text-xs">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="approved">Approved Only</SelectItem>
                  <SelectItem value="pending">Pending Only</SelectItem>
                  <SelectItem value="rejected">Rejected Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Search Bar */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Search className="h-3.5 w-3.5 text-primary" /> Search Student
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Name, Adm No, GR No..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 bg-slate-50 dark:bg-zinc-800 border-slate-200 text-xs rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* Active Filter Status & Reset */}
          {(selectedClass !== "ALL" || selectedDivision !== "ALL" || selectedStatus !== "ALL" || searchQuery) && (
            <div className="flex items-center justify-between pt-3 border-t dark:border-zinc-800 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-600 dark:text-zinc-400">Active Filters:</span>
                {selectedClass !== "ALL" && (
                  <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                    Class: {selectedClass}
                  </Badge>
                )}
                {selectedDivision !== "ALL" && (
                  <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                    Division: {selectedDivision}
                  </Badge>
                )}
                {selectedStatus !== "ALL" && (
                  <Badge variant="outline" className="capitalize bg-slate-100 text-slate-700">
                    Status: {selectedStatus}
                  </Badge>
                )}
              </div>
              <Button
                size="xs"
                variant="ghost"
                onClick={() => {
                  setSelectedClass("ALL");
                  setSelectedDivision("ALL");
                  setSelectedStatus("ALL");
                  setSearchQuery("");
                }}
                className="text-rose-600 hover:bg-rose-50 h-7 rounded-lg text-xs"
              >
                <X className="h-3 w-3 mr-1" /> Reset Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Class Students Counter Banner & View Mode Toggle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-gradient-to-r from-indigo-900 via-purple-950 to-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-sm gap-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center">
            <School className="h-5 w-5 text-indigo-300" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              {selectedClass === "ALL" ? "All Class Students" : `Class ${selectedClass}`}
              {selectedDivision !== "ALL" && <span>· Division {selectedDivision}</span>}
            </h3>
            <p className="text-xs text-indigo-200">
              Showing <span className="font-bold text-white">{filteredAdmissions.length}</span> students in current selection
            </p>
          </div>
        </div>

        {/* View Mode Toggle Controls */}
        <div className="flex items-center gap-1 bg-white/10 p-1 rounded-xl shrink-0 self-end sm:self-auto">
          <Button
            size="xs"
            variant={viewMode === "table" ? "secondary" : "ghost"}
            onClick={() => setViewMode("table")}
            className={cn(
              "h-7 rounded-lg text-xs font-semibold gap-1.5 transition-all",
              viewMode === "table" ? "bg-white text-indigo-950 shadow-xs font-bold" : "text-white hover:bg-white/10"
            )}
          >
            <List className="h-3.5 w-3.5" /> Table Format
          </Button>
          <Button
            size="xs"
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            onClick={() => setViewMode("grid")}
            className={cn(
              "h-7 rounded-lg text-xs font-semibold gap-1.5 transition-all",
              viewMode === "grid" ? "bg-white text-indigo-950 shadow-xs font-bold" : "text-white hover:bg-white/10"
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" /> Grid Cards
          </Button>
        </div>
      </div>

      {/* Student List View */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-zinc-900 rounded-2xl border dark:border-zinc-800">
          <Loader2 className="h-8 w-8 text-primary animate-spin mb-3" />
          <p className="text-xs text-muted-foreground font-medium">Loading class student records...</p>
        </div>
      ) : filteredAdmissions.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-2xl border dark:border-zinc-800 p-6 space-y-3">
          <Users className="h-10 w-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200">No students found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No student records match the selected class, division, or search criteria.
          </p>
        </div>
      ) : viewMode === "table" ? (
        /* Sleek Data Table View */
        <Card className="rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-2xs overflow-hidden bg-white dark:bg-zinc-950">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-zinc-900/80 border-b border-slate-200 dark:border-zinc-800 text-[11px] uppercase tracking-wider font-bold text-slate-500 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-3.5 w-12 text-center">#</th>
                  <th className="px-4 py-3.5">Student Name & Adm No</th>
                  <th className="px-4 py-3.5">GR Number</th>
                  <th className="px-4 py-3.5">Class & Div</th>
                  <th className="px-4 py-3.5">Father / Guardian</th>
                  <th className="px-4 py-3.5">Contact No</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60 font-medium">
                {filteredAdmissions.map((adm, index) => {
                  const sName = getStudentName(adm);
                  const sClass = getStudentClass(adm);
                  const sDiv = getStudentDivision(adm);
                  const sPhone = getStudentMobile(adm);
                  const sGuardian = getStudentGuardian(adm);

                  return (
                    <tr
                      key={adm.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-zinc-900/50 transition-colors"
                    >
                      {/* Index */}
                      <td className="px-4 py-3 text-center text-slate-400 font-mono text-[11px]">
                        {index + 1}
                      </td>

                      {/* Student Info */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3 min-w-[200px]">
                          <StudentAvatar name={sName} />
                          <div>
                            <p className="font-bold text-slate-900 dark:text-zinc-100 text-xs">{sName}</p>
                            <p className="text-[10px] font-mono text-slate-400">Adm: {adm.admission_number}</p>
                          </div>
                        </div>
                      </td>

                      {/* GR Number */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {adm.gr_no ? (
                          <Badge className="font-mono bg-emerald-500 text-white font-bold text-[11px] px-2 py-0.5 shadow-2xs">
                            GR: {adm.gr_no}
                          </Badge>
                        ) : (
                          <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 px-2 py-0.5 rounded-full">
                            No GR Assigned
                          </span>
                        )}
                      </td>

                      {/* Class & Division */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800">
                            Class {sClass}
                          </Badge>
                          {sDiv && sDiv !== "N/A" ? (
                            <Badge variant="outline" className="font-bold bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800">
                              Div {sDiv}
                            </Badge>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">No Div</span>
                          )}
                        </div>
                      </td>

                      {/* Guardian */}
                      <td className="px-4 py-3 whitespace-nowrap text-slate-700 dark:text-zinc-300 font-medium">
                        {sGuardian || "—"}
                      </td>

                      {/* Phone */}
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-slate-700 dark:text-zinc-300">
                        {sPhone || "—"}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge status={adm.status} />
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="xs"
                            onClick={() => setSelectedDetailStudent(adm)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs gap-1 h-7 px-2.5 shadow-2xs"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>View Details</span>
                          </Button>

                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => openFieldEdit(adm)}
                            className="rounded-lg h-7 w-7 p-0 text-slate-600 hover:text-slate-900 border-slate-200"
                            title="Edit Information"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </Button>
                          {!adm.gr_no && (
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => setGrAdmission(adm)}
                              className="h-7 w-7 p-0 rounded-lg text-amber-600 hover:text-amber-700 border-amber-200 hover:bg-amber-50"
                              title="Assign GR Number"
                            >
                              <Hash className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAdmissions.map((adm) => {
            const sName = getStudentName(adm);
            const sClass = getStudentClass(adm);
            const sDiv = getStudentDivision(adm);
            const sPhone = getStudentMobile(adm);
            const sGuardian = getStudentGuardian(adm);

            return (
              <Card
                key={adm.id}
                className="relative overflow-hidden border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs hover:shadow-md transition-all duration-200 rounded-2xl flex flex-col justify-between"
              >
                <CardHeader className="pb-3 flex flex-row items-start justify-between gap-3 space-y-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <StudentAvatar name={sName} />
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-zinc-100 truncate">
                        {sName}
                      </h4>
                      <p className="text-[11px] font-mono text-slate-500">
                        Adm No: {adm.admission_number}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={adm.status} />
                </CardHeader>

                <CardContent className="space-y-3 pt-0 text-xs">
                  {/* Class & Division Pill */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-100 dark:border-zinc-700/60">
                    <div className="flex items-center gap-1.5">
                      <School className="h-3.5 w-3.5 text-indigo-600" />
                      <span className="font-bold text-slate-800 dark:text-zinc-200">
                        Class {sClass}
                      </span>
                      {sDiv !== "N/A" && (
                        <span className="text-slate-400 font-normal">({sDiv})</span>
                      )}
                    </div>
                    {adm.gr_no ? (
                      <Badge className="font-mono text-[10px] bg-emerald-500 text-white font-bold">
                        GR: {adm.gr_no}
                      </Badge>
                    ) : (
                      <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                        No GR
                      </span>
                    )}
                  </div>

                  {/* Parent & Phone Info */}
                  <div className="space-y-1.5 text-slate-600 dark:text-zinc-400">
                    {sGuardian && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Guardian:</span>
                        <span className="font-medium text-slate-800 dark:text-zinc-200 truncate max-w-[150px]">
                          {sGuardian}
                        </span>
                      </div>
                    )}
                    {sPhone && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Phone:</span>
                        <span className="font-medium text-slate-800 dark:text-zinc-200">
                          {sPhone}
                        </span>
                      </div>
                    )}
                  </div>

                  <Separator className="dark:bg-zinc-800" />

                  {/* Card Actions */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <Button
                      size="xs"
                      onClick={() => setSelectedDetailStudent(adm)}
                      className="flex-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800 font-semibold rounded-xl text-xs gap-1 h-8"
                    >
                      <Eye className="h-3.5 w-3.5" /> View Details
                    </Button>
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => openFieldEdit(adm)}
                      className="h-8 w-8 p-0 rounded-xl text-slate-600 hover:text-slate-900 border-slate-200"
                      title="Edit Fields"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </Button>
                    {!adm.gr_no && (
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => setGrAdmission(adm)}
                        className="h-8 w-8 p-0 rounded-xl text-amber-600 hover:text-amber-700 border-amber-200 hover:bg-amber-50"
                        title="Assign GR Number"
                      >
                        <Hash className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Student Details Full View Modal */}
      <StudentDetailsModal
        admission={selectedDetailStudent}
        studentName={selectedDetailStudent ? getStudentName(selectedDetailStudent) : ""}
        classes={classes}
        onClose={() => setSelectedDetailStudent(null)}
        onEditFields={() => {
          if (selectedDetailStudent) openFieldEdit(selectedDetailStudent);
        }}
        onEditDocs={() => {
          if (selectedDetailStudent) openDocEdit(selectedDetailStudent);
        }}
        onAssignGr={() => {
          if (selectedDetailStudent) setGrAdmission(selectedDetailStudent);
        }}
        onRefresh={fetchData}
      />

      {/* GR Number Dialog */}
      <GrNumberDialog
        admission={grAdmission}
        studentName={grAdmission ? getStudentName(grAdmission) : ""}
        onClose={() => setGrAdmission(null)}
        onSuccess={fetchData}
      />

      {/* Field Edit Dialog */}
      <Dialog open={!!editingAdmission} onOpenChange={(open) => !open && setEditingAdmission(null)}>
        <DialogContent className="max-w-md bg-white dark:bg-zinc-950 border dark:border-zinc-800 shadow-2xl rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Edit3 className="h-5 w-5 text-primary" />
              Edit Student Details
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Updating information for <span className="font-semibold text-slate-900 dark:text-zinc-100">{editingAdmission ? getStudentName(editingAdmission) : ""}</span>
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[350px] pr-3 my-2 space-y-3">
            {editingAdmission?.field_values.map((fv) => {
              const isClassField =
                fv.field_label.toLowerCase().includes("class") ||
                fv.field_label.toLowerCase().includes("standard");

              const currentValue = editedFields[String(fv.field)] ?? fv.value;

              if (isClassField && classes.length > 0) {
                const matchedClass = classes.find(
                  (c) => String(c.id) === String(currentValue) || c.school_class === currentValue
                );
                const selectedVal = matchedClass ? String(matchedClass.id) : String(currentValue);

                return (
                  <div key={fv.field} className="space-y-1 mb-3">
                    <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                      {fv.field_label}
                    </label>
                    <Select
                      value={selectedVal}
                      onValueChange={(val) =>
                        setEditedFields((prev) => ({
                          ...prev,
                          [String(fv.field)]: val || "",
                        }))
                      }
                    >
                      <SelectTrigger className="w-full bg-slate-50 dark:bg-zinc-900 border-slate-200 text-xs rounded-xl h-10">
                        <SelectValue placeholder="Select Class">
                          {matchedClass ? matchedClass.school_class : currentValue || "Select Class"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map((cls) => (
                          <SelectItem key={cls.id} value={String(cls.id)}>
                            {cls.school_class}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              }

              return (
                <div key={fv.field} className="space-y-1 mb-3">
                  <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    {fv.field_label}
                  </label>
                  <Input
                    value={editedFields[String(fv.field)] ?? fv.value}
                    onChange={(e) =>
                      setEditedFields((prev) => ({
                        ...prev,
                        [String(fv.field)]: e.target.value,
                      }))
                    }
                    className="bg-slate-50 dark:bg-zinc-900 border-slate-200 text-xs rounded-xl"
                  />
                </div>
              );
            })}
          </ScrollArea>

          <DialogFooter className="pt-4 border-t dark:border-zinc-800 flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingAdmission(null)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveFields}
              disabled={isSavingFields}
              className="rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground font-semibold"
            >
              {isSavingFields ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Bulk Selection Floating Action Bar ─────────────────────────────── */}
      {selectedStudentIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-slate-900/95 dark:bg-zinc-900/95 text-white px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-md border border-slate-700/60 dark:border-zinc-700/60 animate-in fade-in slide-in-from-bottom-5">
          <div className="flex items-center gap-2">
            <Badge className="bg-indigo-500 text-white font-mono font-bold text-xs px-2 py-0.5">
              {selectedStudentIds.length}
            </Badge>
            <span className="text-xs font-medium text-slate-200">
              Student(s) Selected
            </span>
          </div>

          <Separator orientation="vertical" className="h-4 bg-slate-700" />

          <Button
            size="sm"
            onClick={() => setAssignDivModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold gap-1.5 shadow-sm"
          >
            <Layers className="h-4 w-4" /> Bulk Assign Division
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedStudentIds([])}
            className="text-slate-400 hover:text-white rounded-xl text-xs px-2.5"
          >
            Clear Selection
          </Button>
        </div>
      )}

      {/* ── Assign / Change Division Dialog ───────────────────────────────── */}
      <Dialog
        open={assignDivModalOpen || Boolean(singleStudentForDiv)}
        onOpenChange={(open) => {
          if (!open) {
            setAssignDivModalOpen(false);
            setSingleStudentForDiv(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-indigo-900 dark:text-indigo-200">
              <Layers className="h-5 w-5 text-indigo-600" />
              Assign Division to Student(s)
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {singleStudentForDiv
                ? `Assigning division for student "${getStudentName(singleStudentForDiv)}"`
                : `Updating division for ${selectedStudentIds.length} selected student(s)`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Target Division / Section
              </label>
              <div className="grid grid-cols-2 gap-2">
                {["A", "B", "C", "D"].map((div) => (
                  <button
                    key={div}
                    type="button"
                    onClick={() => setTargetDivision(div)}
                    className={cn(
                      "py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-between",
                      targetDivision === div
                        ? "border-indigo-600 bg-indigo-50 text-indigo-900 dark:bg-indigo-950/80 dark:text-indigo-200 dark:border-indigo-500 shadow-2xs"
                        : "border-slate-200 hover:border-slate-300 text-slate-700 dark:border-zinc-800 dark:text-zinc-300"
                    )}
                  >
                    <span>Division {div}</span>
                    {targetDivision === div && <CheckCircle2 className="h-4 w-4 text-indigo-600" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500">Or Select Special Distribution</label>
              <button
                type="button"
                onClick={() => setTargetDivision("AUTO_ROUND_ROBIN")}
                className={cn(
                  "w-full py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-between",
                  targetDivision === "AUTO_ROUND_ROBIN"
                    ? "border-purple-600 bg-purple-50 text-purple-900 dark:bg-purple-950/80 dark:text-purple-200 dark:border-purple-500 shadow-2xs"
                    : "border-slate-200 hover:border-slate-300 text-slate-700 dark:border-zinc-800 dark:text-zinc-300"
                )}
              >
                <span className="flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                  Auto-Distribute Evenly (A, B, C, D)
                </span>
                {targetDivision === "AUTO_ROUND_ROBIN" && <CheckCircle2 className="h-4 w-4 text-purple-600" />}
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 text-[11px] text-slate-600 dark:text-zinc-400 space-y-1">
              <p className="font-semibold text-slate-800 dark:text-zinc-200">ℹ️ Division Allocation Summary:</p>
              <p>
                Students will be placed into{" "}
                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                  {targetDivision === "AUTO_ROUND_ROBIN" ? "Equal Divisions (A/B/C/D)" : `Division ${targetDivision}`}
                </span>
                . All timetable, roll numbers & division rosters will update automatically.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setAssignDivModalOpen(false);
                setSingleStudentForDiv(null);
              }}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleAssignDivision}
              disabled={isAssigningDiv}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs gap-1.5 shadow-sm"
            >
              {isAssigningDiv ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" /> Save Division Assignment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
