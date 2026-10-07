"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  FileStack,
  Loader2,
  Plus,
  Settings2,
  Trash2,
  School,
  FileText,
  GraduationCap,
  Calendar,
  Mail,
  Phone,
  Upload,
  Check,
  AlertCircle,
  ArrowRight,
  Send,
  X,
  Sparkles,
  BookOpen,
  IndianRupee,
  LayoutGrid,
} from "lucide-react";

import {
  createAdmissionForm,
  getSchoolClasses,
  getMainAcademicYear,
  type SchoolClass,
} from "@/lib/principal";
import {
  createConfiguredField,
  DOCUMENT_FIELD_TEMPLATES,
  FIELD_TYPE_OPTIONS,
  PERSONAL_FIELD_TEMPLATES,
  SCHOOL_CLASS_OPTIONS,
} from "@/lib/form-builder-config";
import type {
  AdmissionFormCreatePayload,
  AdmissionFormFieldPayload,
  AdmissionFormResponse,
  BuilderFieldType,
  BuilderOption,
  ConfiguredField,
} from "@/types/principal";
import { cn } from "@/lib/utils";
import { validateAdmissionBuilder } from "@/lib/admission-builder-validation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type ErrorMap = Record<string, string>;

const STEP_TITLES = [
  {
    title: "Basic Info",
    description: "Form title & student fields",
    icon: School,
    color: "from-violet-500 to-purple-600",
    bg: "bg-violet-50",
    text: "text-violet-600",
    border: "border-violet-200",
  },
  {
    title: "Documents",
    description: "Required document uploads",
    icon: FileStack,
    color: "from-blue-500 to-cyan-600",
    bg: "bg-blue-50",
    text: "text-blue-600",
    border: "border-blue-200",
  },
  {
    title: "Publish",
    description: "Set fees & go live",
    icon: Sparkles,
    color: "from-emerald-500 to-teal-600",
    bg: "bg-emerald-50",
    text: "text-emerald-600",
    border: "border-emerald-200",
  },
];

const FIELD_ICONS: Record<string, any> = {
  text: FileText,
  email: Mail,
  tel: Phone,
  number: GraduationCap,
  date: Calendar,
  file: Upload,
  select: ChevronRight,
  textarea: FileText,
};

const FIELD_TYPE_COLORS: Record<string, string> = {
  text: "bg-slate-100 text-slate-600",
  email: "bg-purple-100 text-purple-600",
  tel: "bg-green-100 text-green-600",
  number: "bg-orange-100 text-orange-600",
  date: "bg-blue-100 text-blue-600",
  file: "bg-pink-100 text-pink-600",
  select: "bg-yellow-100 text-yellow-700",
  textarea: "bg-indigo-100 text-indigo-600",
};

function cloneField(field: ConfiguredField, index: number) {
  return {
    ...field,
    lockedRequired: field.required,
    id: `${field.key}-${index}-${Math.random().toString(36).slice(2, 8)}`,
    options: field.options.map((option) => ({ ...option })),
  };
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

// Converts "2025-2026" → "2025-26" for payload
function shortYear(year: string) {
  const parts = year.split("-");
  if (parts.length === 2 && parts[1].length === 4) {
    return `${parts[0]}-${parts[1].slice(2)}`;
  }
  return year;
}

function createCustomField(
  section: "personal" | "documents",
  count: number,
): ConfiguredField {
  const key = `${section}_custom_${count + 1}`;
  return {
    id: `${key}-${Date.now()}`,
    key,
    label:
      section === "personal" ? "Additional Information" : "Additional Document",
    type: section === "documents" ? "file" : "text",
    required: section === "documents",
    placeholder: "",
    options: [],
    selected: true,
    custom: true,
    lockedType: section === "documents",
    lockedRequired: false,
  };
}

const STUDENT_FIELD_MAPPING: Record<string, string> = {
  student_full_name: "name",
  surname: "surname",
  father_name: "father_name",
  mother_name: "mother_name",
  date_of_birth: "date_of_birth",
  mobile_number: "mobile",
  applying_for_class: "school_class",
  division: "division",
};

function toPayloadFields(
  fields: ConfiguredField[],
): AdmissionFormFieldPayload[] {
  return fields
    .filter((field): field is ConfiguredField => field.selected)
    .map((field, index) => {
      const isSelect = field.type === "select" || field.type === "radio";
      const validOptions = isSelect
        ? field.options.filter((option) => option.label && option.value)
        : [];
      return {
        label: field.label.trim(),
        field_type: field.type,
        required: field.required,
        is_required: field.required,
        order: index + 1,
        map_to_student_field: STUDENT_FIELD_MAPPING[field.key] || null,
        ...(field.key === "applying_for_class"
          ? {}
          : isSelect && validOptions.length > 0
            ? { options: validOptions }
            : {}),
      };
    });
}

// ─── Field Card (redesigned) ────────────────────────────────────────────────
function FieldCard({
  field,
  onToggle,
  onChange,
  onRemove,
  section,
  classes,
  index: cardIndex,
}: {
  field: ConfiguredField;
  onToggle: (checked: boolean) => void;
  onChange: (nextField: ConfiguredField) => void;
  onRemove?: () => void;
  section?: "personal" | "documents";
  classes: SchoolClass[];
  index?: number;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const IconComponent = FIELD_ICONS[field.type] || FileText;
  const isDocumentField = section === "documents";
  const typeColor = FIELD_TYPE_COLORS[field.type] || "bg-slate-100 text-slate-600";

  const setOptionValue = (
    optionIndex: number,
    nextKey: keyof BuilderOption,
    nextValue: string,
  ) => {
    const nextOptions = field.options.map((option, index) =>
      index === optionIndex ? { ...option, [nextKey]: nextValue } : option,
    );
    onChange({ ...field, options: nextOptions });
  };

  const addOption = () => {
    onChange({
      ...field,
      options: [...field.options, { label: "", value: "" }],
    });
  };

  const removeOption = (optionIndex: number) => {
    onChange({
      ...field,
      options: field.options.filter((_, index) => index !== optionIndex),
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ duration: 0.2, delay: (cardIndex ?? 0) * 0.03 }}
      layout
    >
      <div
        className={cn(
          "group relative rounded-xl border transition-all duration-200",
          field.selected
            ? "border-slate-200 bg-white shadow-sm shadow-slate-100"
            : "border-slate-300 bg-slate-50",

        )}
      >
        {/* Left accent bar when selected */}
        {field.selected && (
          <div className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-gradient-to-b from-violet-400 to-purple-500" />
        )}

        <div className="flex items-center gap-2.5 px-3 py-3 pl-4">
          {/* Checkbox */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Checkbox
                    checked={field.selected}
                    disabled={field.key === "applying_for_class" || field.lockedType}
                    onCheckedChange={(checked) => onToggle(Boolean(checked))}
                    className="h-4 w-4 rounded data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600"
                  />
                </div>
              </TooltipTrigger>
              {field.key === "applying_for_class" && (
                <TooltipContent side="right" className="text-xs">
                  Mandatory field — cannot be deselected
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>

          {/* Icon */}
          <div className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
            field.selected ? typeColor : "bg-slate-200 text-slate-600",

          )}>
            <IconComponent className="h-3.5 w-3.5" />
          </div>

          {/* Label & Meta */}
          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={cn(
                "text-sm font-semibold truncate leading-tight",
                field.selected ? "text-slate-800" : "text-slate-700",
              )}>
                {field.label}
              </span>
              {field.required && field.selected && (
                <span className="inline-flex items-center rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-500 border border-red-100 whitespace-nowrap">
                  Req
                </span>
              )}
              {field.custom && (
                <span className="inline-flex items-center rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 border border-amber-200 whitespace-nowrap">
                  Custom
                </span>
              )}
            </div>
            <p className={cn(
              "text-[11px] mt-0.5 font-mono truncate",
              field.selected ? "text-slate-700" : "text-slate-600",
            )}>
              {field.key} · {field.key === "applying_for_class" ? "text" : field.type}
            </p>
          </div>

          {/* Actions — always visible */}
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-lg transition-colors",
                isExpanded
                  ? "bg-violet-100 text-violet-600"
                  : "text-slate-400 hover:bg-violet-50 hover:text-violet-500",
              )}
            >
              <Settings2 className="h-3.5 w-3.5" />
            </button>
            {onRemove && (
              <button
                onClick={onRemove}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Expanded config panel */}
        <AnimatePresence>
          {field.selected && isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mx-2.5 mb-2.5 mt-1 rounded-lg border border-slate-100 bg-slate-50/80 p-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Label</Label>
                    <Input
                      value={field.label}
                      onChange={(e) => onChange({ ...field, label: e.target.value })}
                      placeholder="Field Name"
                      className="h-9 rounded-lg border-slate-200 bg-white text-sm focus-visible:ring-violet-400"
                    />
                  </div>

                  {!isDocumentField && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</Label>
                      <select
                        className="flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm shadow-none outline-none focus:ring-2 focus:ring-violet-400 disabled:opacity-50"
                        value={field.type}
                        disabled={field.key === "applying_for_class"}
                        onChange={(e) =>
                          onChange({
                            ...field,
                            type: e.target.value as BuilderFieldType,
                            options:
                              ["select", "radio"].includes(e.target.value) && !field.options.length
                                ? [{ label: "", value: "" }]
                                : field.options,
                          })
                        }
                      >
                        {FIELD_TYPE_OPTIONS.filter(option => option.value !== "file").map((option, index) => (
                          <option key={option.value || `field-option-${index}`} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {!field.lockedRequired && !isDocumentField && (
                    <div className="col-span-full flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2.5">

                      <div>
                        <p className="text-sm font-medium text-slate-700">Required field</p>
                        <p className="text-xs text-slate-400">Applicant must complete this</p>
                      </div>
                      <Switch
                        checked={field.required}
                        onCheckedChange={(checked) => onChange({ ...field, required: Boolean(checked) })}
                        className="data-[state=checked]:bg-violet-600"
                      />
                    </div>
                  )}
                </div>

                {["select", "radio"].includes(field.type) && field.key !== "applying_for_class" && (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Options</Label>
                      <Button type="button" variant="ghost" size="sm" onClick={addOption} className="h-7 text-xs text-violet-600 hover:bg-violet-50">
                        <Plus className="mr-1 h-3 w-3" /> Add
                      </Button>
                    </div>
                    {field.options.map((option, index) => (
                      <div key={`${option.value || "option"}-${index}`} className="flex gap-2">
                        <Input value={option.label} placeholder="Label" onChange={(e) => setOptionValue(index, "label", e.target.value)} className="h-8 rounded-lg text-sm" />
                        <Input value={option.value} placeholder="Value" onChange={(e) => setOptionValue(index, "value", e.target.value)} className="h-8 rounded-lg text-sm" />
                        <button onClick={() => removeOption(index)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

type Section = {
  id: number;
  title: string;
  order: number;
  fields: ConfiguredField[];
};

// ─── Main Component ──────────────────────────────────────────────────────────
export default function PrincipalFormBuilder({
  onSuccess,
}: {
  onSuccess?: (form: AdmissionFormResponse) => void;
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [academicYearOptions, setAcademicYearOptions] = useState<{ id: number; name: string }[]>([]);
  const [academicYear, setAcademicYear] = useState("");
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);

  const [title, setTitle] = useState("Student Admission Form");
  const [description, setDescription] = useState("");
  const [documentSectionTitle, setDocumentSectionTitle] = useState("Required Documents");

  const [sections, setSections] = useState<Section[]>([
    {
      id: Date.now(),
      title: "Student Information",
      order: 1,
      fields: PERSONAL_FIELD_TEMPLATES.map((field, index) => {
        const configuredField = createConfiguredField(field);
        if (configuredField.key === "applying_for_class") {
          configuredField.options = [];
        }
        return cloneField(configuredField, index);
      }),
    },
  ]);

  const [documentFields, setDocumentFields] = useState<ConfiguredField[]>(
    DOCUMENT_FIELD_TEMPLATES.map((field, index) => cloneField(createConfiguredField(field), index)),
  );

  const [feesEnabled, setFeesEnabled] = useState(false);
  const [paymentMode, setPaymentMode] = useState<"online" | "offline">("online");
  const [feeType, setFeeType] = useState<"general" | "individual">("general");
  const [feesAmount, setFeesAmount] = useState("");
  const [individualFees, setIndividualFees] = useState<Record<number, string>>({});
  const [errors, setErrors] = useState<ErrorMap>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [createdForm, setCreatedForm] = useState<AdmissionFormResponse | null>(null);
  const [classes, setClasses] = useState<SchoolClass[]>([]);

  useEffect(() => {
    async function fetchClasses() {
      try {
        // Fetch academic year from API
        const yearList = await getMainAcademicYear();
        if (yearList.length > 0) {
          setAcademicYearOptions(yearList);
          setAcademicYear(yearList[0].name);
          setAcademicYearId(yearList[0].id);
          setTitle(`Student Admission Form ${yearList[0].name}`);

        }


        const data = await getSchoolClasses();
        if (data && data.length > 0) {
          const sortedData = [...data].sort((a, b) => {
            const indexA = SCHOOL_CLASS_OPTIONS.findIndex((opt) => opt.value === a.school_class);
            const indexB = SCHOOL_CLASS_OPTIONS.findIndex((opt) => opt.value === b.school_class);
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
          });
          setClasses(sortedData);
          setSections((prev) =>
            prev.map((section) => ({
              ...section,
              fields: section.fields.map((field) =>
                field.key === "applying_for_class"
                  ? { ...field, options: sortedData.map((cls) => ({ label: cls.school_class, value: String(cls.id) })) }
                  : field,
              ),
            })),
          );
          const initialFees: Record<number, string> = {};
          sortedData.forEach((cls) => { initialFees[cls.id] = ""; });
          setIndividualFees(initialFees);
        }
      } catch (err) {
        console.error("Failed to fetch classes:", err);
      }
    }
    fetchClasses();
  }, []);

  const payload = useMemo<AdmissionFormCreatePayload>(() => {
    const document_fields = documentFields.filter((field) => field.selected).map((field) => field.label.trim());
    const defaultTitle = "Student Admission Form";
    const defaultSectionTitle = "Student Information";
    const effectiveTitle = title.trim() || defaultTitle;
    const formTitle = effectiveTitle; // title already has year from state


    return {
      is_active: true,
      fees_enable: feesEnabled,
      fees: feesEnabled && feeType === "general" ? Number(feesAmount) || 0 : null,
      title: formTitle,
      academic_year: academicYearId,
      description: description.trim() || `Admission form for academic year ${academicYear}`,
      unique_link: slugify(formTitle),
      fee_type: feeType,
      payment_mode: feesEnabled ? paymentMode : null,
      sections: sections.map((section, index) => ({
        title: section.title.trim() || (index === 0 ? defaultSectionTitle : `Section ${index + 1}`),
        order: index + 1,
        fields: toPayloadFields(section.fields),
      })),
      document_fields,
      document_fields_config: documentFields.filter(field => field.selected).map(field => ({ label: field.label.trim(), is_required: field.required })),
      fee_structures_input: feesEnabled && feeType === "individual"
        ? Object.entries(individualFees)
          .filter(([_, amt]) => amt && Number(amt) > 0)
          .map(([id, amt]) => ({ class_name: Number(id), fee_amount: Number(amt).toFixed(2) }))
        : [],
    };
  }, [academicYear, academicYearId, description, documentFields, feeType, feesAmount, feesEnabled, individualFees, paymentMode, sections, title]);

  const getBuilderErrors = (step?: number) => validateAdmissionBuilder({ title, academicYearId, description, sections, documents: documentFields, feesEnabled, feeType, feesAmount, individualFees, classIds: classes.map(cls => cls.id) }, step);
  const validateStep = (step: number) => {
    const nextErrors = getBuilderErrors(step);
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const nextStep = () => {
    if (!validateStep(currentStep)) return;
    setCurrentStep((value) => Math.min(value + 1, STEP_TITLES.length - 1));
  };

  const previousStep = () => {
    setErrors({});
    setCurrentStep((value) => Math.max(value - 1, 0));
  };

  const submitForm = async () => {
    if (isSubmitting) return;
    const allErrors = getBuilderErrors();
    if (Object.keys(allErrors).length) {
      const invalidStep = [0, 1, 2].find(step => Object.keys(getBuilderErrors(step)).length > 0) ?? 0;
      setCurrentStep(invalidStep); setErrors(allErrors); return;
    }
    setIsSubmitting(true);
    setSubmitError("");
    try {
      const response = await createAdmissionForm(payload);
      setCreatedForm(response);
      onSuccess?.(response);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to create admission form");
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateFieldList = (updater: (fields: ConfiguredField[]) => ConfiguredField[]): void => {
    setDocumentFields((current: ConfiguredField[]) => updater(current));
  };

  const updateSectionFields = (sectionId: number, updater: (fields: ConfiguredField[]) => ConfiguredField[]) => {
    setSections((current) =>
      current.map((section) =>
        section.id === sectionId ? { ...section, fields: updater(section.fields) } : section,
      ),
    );
  };

  const sortFields = (fields: ConfiguredField[]) => {
    return [...fields].sort((a, b) => {
      if (a.key === "applying_for_class") return -1;
      if (b.key === "applying_for_class") return 1;
      return 0;
    });
  };

  const getSelectedCount = (fields: ConfiguredField[]) => fields.filter((f) => f.selected).length;

  const totalStudentFields = sections.reduce((total, section) => total + getSelectedCount(section.fields), 0);
  const totalDocFields = getSelectedCount(documentFields);

  return (
    <div className="min-h-screen bg-[#F7F7FA]">
      {/* ── Top Header ── */}
      <div className="border-b border-slate-200 bg-white px-3 py-3 sm:px-6 sm:py-4">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 shadow-sm shadow-violet-200">
                <School className="h-4.5 w-4.5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <span>Admission Management</span>
                  <ChevronRight className="h-3 w-3" />
                  <span className="text-slate-600 font-medium">Form Builder</span>
                </div>
                <h1 className="text-base font-bold text-slate-900 leading-tight">Create Admission Form</h1>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                Academic Year
              </span>
              <select
                value={academicYearId ?? ""}
                onChange={(e) => {
                  const selected = academicYearOptions.find((y) => y.id === Number(e.target.value));
                  if (selected) {
                    setAcademicYearId(selected.id);
                    setAcademicYear(selected.name);
                    setTitle((prev) => {
                      const base = prev.replace(/\s+\S+-\S+$/, "").trim();
                      return `${base} ${selected.name}`;
                    });
                  }
                }}
                className="h-9 flex-1 sm:flex-none sm:w-auto rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-violet-400"
              >
                {academicYearOptions.length === 0 ? (
                  <option>Loading...</option>
                ) : (
                  academicYearOptions.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.name.replace("-", " – ")}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-3 py-4 sm:px-4 sm:py-8">
        {/* ── Step Indicator ── */}
        <div className="mb-8 flex items-center gap-2 overflow-x-auto pb-1">

          {STEP_TITLES.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === index;
            const isDone = currentStep > index;

            return (
              <div key={step.title} className="flex items-center gap-2">
                <motion.div
                  animate={{
                    scale: isActive ? 1 : 0.95,
                    opacity: isDone || isActive ? 1 : 0.7,
                  }}
                  className={cn(
                    "flex items-center gap-2.5 rounded-2xl px-4 py-2.5 transition-colors shrink-0",

                    isActive && "bg-white border border-slate-200 shadow-sm",
                    isDone && "bg-emerald-50 border border-emerald-100",
                    !isActive && !isDone && "bg-transparent",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-xl",
                      isActive && `bg-gradient-to-br ${step.color} text-white shadow-sm`,
                      isDone && "bg-emerald-500 text-white",
                      !isActive && !isDone && "bg-slate-200 text-slate-400",
                    )}
                  >
                    {isDone ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                  </div>
                  <div className="hidden sm:block">
                    <p className={cn("text-sm font-semibold leading-none", isActive ? "text-slate-900" : isDone ? "text-emerald-700" : "text-slate-400")}>
                      {step.title}
                    </p>
                    <p className={cn("text-[11px] mt-0.5", isActive ? "text-slate-400" : isDone ? "text-emerald-500" : "text-slate-300")}>
                      {step.description}
                    </p>
                  </div>
                </motion.div>

                {index < STEP_TITLES.length - 1 && (
                  <div className={cn("h-px flex-1 min-w-[24px] mx-1 rounded-full transition-colors", currentStep > index ? "bg-emerald-300" : "bg-slate-200")} />
                )}
              </div>
            );
          })}
        </div>

        {/* ── Main Panel ── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
          >
            {Object.keys(errors).length > 0 && <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><p className="mb-2 font-bold">Please correct the following:</p><ul className="list-inside list-disc space-y-1">{Object.entries(errors).map(([key, message]) => <li key={key}>{message}</li>)}</ul></div>}
            {/* ──────────── STEP 0: Basic Info ──────────── */}
            {currentStep === 0 && (
              <div className="space-y-5">
                {/* Metadata card */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="mb-5">
                    <h2 className="text-base font-bold text-slate-900">Form Details</h2>
                    <p className="text-sm text-slate-400 mt-0.5">Set the form's identity before configuring fields</p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Form Title</Label>
                      <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Student Admission Form"

                        className={cn(
                          "h-10 rounded-xl border-slate-200 bg-slate-50 text-sm focus-visible:ring-violet-400 focus-visible:bg-white transition-colors",
                          errors.title && "border-red-300 bg-red-50",
                        )}
                      />
                      {errors.title && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.title}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Section Title</Label>
                      <Input
                        value={sections[0]?.title || ""}
                        onChange={(e) => {
                          const updated = [...sections];
                          updated[0].title = e.target.value;
                          setSections(updated);
                        }}
                        placeholder="e.g., Student Information"
                        className="h-10 rounded-xl border-slate-200 bg-slate-50 text-sm focus-visible:ring-violet-400 focus-visible:bg-white transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Description <span className="normal-case font-normal text-slate-400">(optional)</span></Label>
                      <Textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Brief description about this admission form..."
                        className="resize-none rounded-xl border-slate-200 bg-slate-50 text-sm focus-visible:ring-violet-400 focus-visible:bg-white transition-colors"
                        rows={2}
                      />
                    </div>
                  </div>
                </div>

                {/* Sections */}
                {sections.map((section, sectionIndex) => (
                  <div key={section.id} className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    {/* Section header */}
                    <div className="flex flex-col gap-2 border-b border-slate-100 bg-slate-50/60 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-3.5">
                      {/* Row 1: icon + title + badge + delete */}
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-100">
                          <LayoutGrid className="h-3.5 w-3.5 text-violet-600" />
                        </div>
                        {sectionIndex === 0 ? (
                          <span className="text-sm font-semibold text-slate-700 truncate">{section.title || "Section 1"}</span>
                        ) : (
                          <Input
                            value={section.title}
                            onChange={(e) => {
                              const updated = [...sections];
                              updated[sectionIndex].title = e.target.value;
                              setSections(updated);
                            }}
                            placeholder="Section Title"
                            className="h-7 w-32 sm:w-40 rounded-lg border-slate-200 bg-white text-sm font-semibold focus-visible:ring-violet-400"
                          />
                        )}
                        <span className="shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-700 whitespace-nowrap">
                          {getSelectedCount(section.fields)}/{section.fields.length} selected
                        </span>

                        {/* ← ADD THIS: delete button only for sections after the first */}
                        {sectionIndex > 0 && (
                          <button
                            onClick={() => setSections((prev) => prev.filter((s) => s.id !== section.id))}
                            className="ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors"
                            title="Delete section"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Add Field button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-fit gap-1.5 rounded-lg text-xs font-semibold text-violet-600 hover:bg-violet-50 sm:w-auto"
                        onClick={() =>
                          updateSectionFields(section.id, (fields) => [
                            ...fields,
                            createCustomField("personal", fields.filter((f) => f.custom).length),
                          ])
                        }
                      >
                        <Plus className="h-3.5 w-3.5" /> Add Field
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3">
                      <AnimatePresence initial={false}>
                        {sortFields(section.fields).map((field, fIndex) => (
                          <FieldCard
                            key={field.id}
                            field={field}
                            index={fIndex}
                            classes={classes}
                            section="personal"
                            onToggle={(checked) =>
                              updateSectionFields(section.id, (fields) =>
                                fields.map((item) =>
                                  item.id === field.id
                                    ? { ...item, selected: item.key === "applying_for_class" ? true : checked }
                                    : item,
                                ),
                              )
                            }
                            onChange={(nextField) =>
                              updateSectionFields(section.id, (fields) =>
                                fields.map((item) => (item.id === field.id ? nextField : item)),
                              )
                            }
                            onRemove={
                              field.custom
                                ? () =>
                                  updateSectionFields(section.id, (fields) =>
                                    fields.filter((item) => item.id !== field.id),
                                  )
                                : undefined
                            }
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                ))}

                {/* Add Section */}
                <button
                  onClick={() => {
                    setSections((prev) => [
                      ...prev,
                      { id: Date.now(), title: `Section ${prev.length + 1}`, order: prev.length + 1, fields: [] },
                    ]);
                  }}
                  className="group flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-white py-4 text-sm font-semibold text-slate-400 transition-all hover:border-violet-300 hover:bg-violet-50/50 hover:text-violet-600"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-100 transition-colors group-hover:bg-violet-100 group-hover:text-violet-600">
                    <Plus className="h-3.5 w-3.5" />
                  </div>
                  Add New Section
                </button>
              </div>
            )}

            {/* ──────────── STEP 1: Documents ──────────── */}
            {currentStep === 1 && (
              <div className="space-y-5">
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <div className="flex flex-col gap-2 border-b border-slate-100 bg-slate-50/60 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-3.5">
                    {/* Row 1 on mobile: icon + title + badge */}
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-100">
                        <FileStack className="h-3.5 w-3.5 text-blue-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-700 truncate">Document Requirements</p>
                        <p className="hidden sm:block text-xs text-slate-400">Toggle which documents applicants must upload</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700 whitespace-nowrap">
                        {getSelectedCount(documentFields)} selected
                      </span>
                    </div>

                    {/* Row 2 on mobile: Add Field button (left-aligned) */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-fit gap-1.5 rounded-lg text-xs font-semibold text-blue-600 hover:bg-blue-50 sm:w-auto"
                      onClick={() =>
                        updateFieldList((fields) => [
                          ...fields,
                          createCustomField("documents", fields.filter((f) => f.custom).length),
                        ])
                      }
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Field
                    </Button>
                  </div>

                  <div className="p-3">
                    <div className="mb-3 flex items-center gap-3">
                      <div className="space-y-1 flex-1 max-w-xs">
                        <Label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Section Title</Label>
                        <Input
                          value={documentSectionTitle}
                          onChange={(e) => setDocumentSectionTitle(e.target.value)}
                          className="h-8 rounded-lg border-slate-200 bg-slate-50 text-sm focus-visible:ring-blue-400 focus-visible:bg-white"
                        />
                      </div>
                    </div>

                    <ScrollArea className="h-[360px] sm:h-[480px] pr-1">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <AnimatePresence initial={false}>
                          {sortFields(documentFields).map((field, fIndex) => (
                            <FieldCard
                              key={field.id || `doc-${fIndex}`}
                              field={field}
                              index={fIndex}
                              section="documents"
                              classes={classes}
                              onToggle={(checked) =>
                                updateFieldList((fields) =>
                                  fields.map((item) => (item.id === field.id ? { ...item, selected: checked } : item)),
                                )
                              }
                              onChange={(nextField) =>
                                updateFieldList((fields) =>
                                  fields.map((item) =>
                                    item.id === field.id ? { ...nextField, type: "file", required: true } : item,
                                  ),
                                )
                              }
                              onRemove={
                                field.custom
                                  ? () => updateFieldList((fields) => fields.filter((item) => item.id !== field.id))
                                  : undefined
                              }
                            />
                          ))}
                        </AnimatePresence>
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              </div>
            )}

            {/* ──────────── STEP 2: Review & Publish ──────────── */}
            {currentStep === 2 && (
              <div className="grid gap-5 lg:grid-cols-5 pb-4">
                {/* Left: Fee config */}
                <div className="lg:col-span-3 space-y-4 min-w-0">
                  {/* Fee toggle */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
                          <IndianRupee className="h-4.5 w-4.5 text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">Application Fee</p>
                          <p className="text-xs text-slate-400">Charge applicants before submitting</p>
                        </div>
                      </div>
                      <Switch
                        checked={feesEnabled}
                        onCheckedChange={setFeesEnabled}
                        className="data-[state=checked]:bg-emerald-600"
                      />
                    </div>

                    <AnimatePresence>
                      {feesEnabled && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-4 space-y-4">
                            {/* Fee type toggle */}
                            <div className="flex gap-2">
                              {(["general", "individual"] as const).map((t) => (
                                <button
                                  key={t}
                                  type="button"
                                  onClick={() => setFeeType(t)}
                                  className={cn(
                                    "flex-1 rounded-xl py-2.5 text-xs sm:text-sm font-semibold transition-all border",
                                    feeType === t
                                      ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                                      : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100",
                                  )}
                                >
                                  {t === "general" ? "General Fee" : "Per Class"}
                                </button>
                              ))}
                            </div>

                            {feeType === "general" ? (
                              <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Amount (INR)</Label>
                                <div className="relative">
                                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">₹</span>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={feesAmount}
                                    onChange={(e) => setFeesAmount(e.target.value)}
                                    placeholder="500"
                                    className={cn(
                                      "h-11 pl-8 rounded-xl border-slate-200 bg-slate-50 text-sm focus-visible:ring-emerald-400 focus-visible:bg-white",
                                      errors.fees && "border-red-300 bg-red-50",
                                    )}
                                  />
                                </div>
                                <p className="text-[11px] text-slate-400">Applies to all classes equally</p>
                                {errors.fees && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.fees}</p>}
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Class-wise Fees</Label>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const firstAmt = Object.values(individualFees).find((v) => v !== "") || "0";
                                      const next = { ...individualFees };
                                      classes.forEach((c) => (next[c.id] = firstAmt));
                                      setIndividualFees(next);
                                    }}
                                    className="flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500 hover:bg-slate-200 transition-colors"
                                  >
                                    <Copy className="h-3 w-3" /> Apply first to all
                                  </button>
                                </div>
                                <ScrollArea className="h-52 rounded-xl border border-slate-200 bg-slate-50 p-3">
                                  <div className="space-y-2">
                                    {classes.map((cls, index) => (
                                      <div key={cls.id || `cls-${index}`} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                                        <span className="text-sm font-semibold text-slate-700 truncate flex-1">{cls.school_class}</span>
                                        <div className="relative w-24 shrink-0">
                                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                                          <Input
                                            type="number"
                                            min="0"
                                            value={individualFees[cls.id] || ""}
                                            onChange={(e) => setIndividualFees((prev) => ({ ...prev, [cls.id]: e.target.value }))}
                                            className="h-8 pl-5 rounded-lg text-sm border-slate-200"
                                            placeholder="0"
                                          />
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </ScrollArea>
                                {errors.fees && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.fees}</p>}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Error / Success banners */}
                  <AnimatePresence>
                    {submitError && (
                      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                        <Alert variant="destructive" className="rounded-2xl">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>{submitError}</AlertDescription>
                        </Alert>
                      </motion.div>
                    )}

                    {createdForm && (
                      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                            <p className="text-sm font-bold text-emerald-800">Form Published Successfully!</p>
                          </div>
                          <p className="text-xs text-emerald-700 mb-1">Form ID: <span className="font-mono font-semibold">{createdForm.id}</span></p>
                          <div className="flex items-center gap-2 rounded-lg bg-emerald-100 px-3 py-2">
                            <span className="text-xs text-emerald-600 font-mono break-all">{createdForm.unique_link}</span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Right: Summary */}
                <div className="lg:col-span-2">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:sticky sm:top-4">
                    <div className="flex items-center gap-2 mb-4">
                      <BookOpen className="h-4 w-4 text-slate-400" />
                      <h3 className="text-sm font-bold text-slate-700">Form Summary</h3>
                    </div>

                    <div className="space-y-3">
                      {[
                        { label: "Academic Year", value: shortYear(academicYear) },
                        { label: "Student Fields", value: totalStudentFields },
                        { label: "Document Fields", value: totalDocFields },
                        { label: "Total Fields", value: totalStudentFields + totalDocFields, bold: true },
                        {
                          label: "Application Fee",
                          value: !feesEnabled ? "Free" : feeType === "individual" ? "Per Class" : `₹${feesAmount || "0"}`,
                          bold: true,
                        },
                      ].map(({ label, value, bold }) => (
                        <div key={label} className={cn("flex items-center justify-between", bold && "pt-2 border-t border-slate-100")}>
                          <span className="text-xs text-slate-400">{label}</span>
                          <span className={cn("text-sm font-semibold", bold ? "text-slate-900" : "text-slate-600")}>
                            {value}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-5 rounded-xl bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-100 p-4">
                      <p className="text-[11px] font-semibold text-violet-700 uppercase tracking-wide mb-1">Form Link</p>
                      <p className="text-xs text-violet-500 font-mono break-all">
                        {slugify(`${title} ${shortYear(academicYear)}`) || "student-admission-form"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* ── Footer Nav ── */}
        <div className="mt-6 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <Button
            variant="ghost"
            onClick={previousStep}
            disabled={currentStep === 0}
            className="h-10 gap-1.5 rounded-xl font-semibold text-slate-500 hover:text-slate-800 disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back</span>
          </Button>

          <div className="flex items-center gap-2">
            {/* Dot indicators */}
            {STEP_TITLES.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-full transition-all duration-300",
                  i === currentStep ? "h-2 w-6 bg-violet-600" : i < currentStep ? "h-2 w-2 bg-emerald-400" : "h-2 w-2 bg-slate-200",
                )}
              />
            ))}
          </div>

          {currentStep < STEP_TITLES.length - 1 ? (
            <Button
              onClick={nextStep}
              className="h-10 gap-1.5 rounded-xl bg-violet-600 px-4 sm:px-6 font-semibold text-white shadow-sm shadow-violet-200 hover:bg-violet-700 transition-all min-w-[110px]"
            >
              Continue
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={submitForm}
              disabled={isSubmitting || !!createdForm}
              className="h-10 gap-1.5 rounded-xl bg-emerald-600 px-4 sm:px-6 font-semibold text-white shadow-sm shadow-emerald-200 hover:bg-emerald-700 disabled:opacity-60 transition-all min-w-[110px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Publishing...
                </>
              ) : createdForm ? (
                <>
                  <Check className="h-4 w-4" />
                  Published!
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Publish Form
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
} 
