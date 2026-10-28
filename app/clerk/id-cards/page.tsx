"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Contact,
  Plus,
  Palette,
  CreditCard,
  Printer,
  Download,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Eye,
  FileText,
  Search,
  Filter,
  Layers,
  Image as ImageIcon,
  Move,
  Maximize2,
  Sliders,
  Sparkles,
  Loader2,
  X,
  QrCode,
  ShieldAlert,
  Copy,
  History,
  Trash2,
  Edit3,
  Check,
  Grid,
  FileSpreadsheet
} from "lucide-react";
import { toast } from "sonner";
import { idCardApi, showApiError, showSuccess, showWarning } from "@/lib/id-card-client";
import { inventoryApi, coreApi } from "@/lib/inventory-client";

interface TemplateField {
  key: string;
  label: string;
  prefix?: string;
  side: "front" | "back";
  visible: boolean;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  width: number; // percentage 0-100
  height: number; // percentage 0-100
  font_size?: number;
  font_weight?: "normal" | "bold";
  font_family?: string;
  color?: string;
  align?: "left" | "center" | "right";
  border_radius?: number;
  text?: string;
}

const FONT_FAMILIES = [
  { label: "Arial (Modern Sans)", value: "Arial, sans-serif" },
  { label: "Times New Roman (Classic Serif)", value: "'Times New Roman', Times, serif" },
  { label: "Roboto (Geometric Sans)", value: "'Roboto', sans-serif" },
  { label: "Montserrat (Display Sans)", value: "'Montserrat', sans-serif" },
  { label: "Courier New (Monospace)", value: "'Courier New', Courier, monospace" },
];

const FIELD_VARIABLE_TAGS: Record<string, string> = {
  photo: "{{photo}}",
  name: "{{full_name}}",
  id_no: "{{id_no}}",
  class_div: "{{class_div}}",
  roll_no: "{{roll_no}}",
  blood_group: "{{blood_group}}",
  valid_upto: "{{valid_upto}}",
  emergency_contact: "{{emergency_contact}}",
  dob: "{{date_of_birth}}",
  mobile: "{{mobile}}",
  address: "{{address}}",
  qr_code: "{{qr_code_data}}",
  instructions: "{{instructions}}",
  custom_1: "{{custom_field_1}}",
  custom_2: "{{custom_field_2}}",
  custom_3: "{{custom_field_3}}",
};

const NO_PREFIX_FIELDS = new Set([
  "name",
  "full_name",
  "first_name",
  "surname",
  "father_name",
  "photo",
  "photograph",
  "qr_code",
  "barcode",
  "instructions"
]);

const formatWithPrefix = (prefix: string | undefined, value: string): string => {
  if (!prefix) return value;
  const trimmed = prefix.trimEnd();
  if (!trimmed) return value;
  return `${trimmed} ${value}`;
};

const getFieldSampleValue = (field: TemplateField) => {
  switch (field.key) {
    case "name":
    case "full_name":
      return "Aman Patel";
    case "id_no":
      return "GR-1042";
    case "class_div":
      return "10 - A";
    case "roll_no":
      return "18";
    case "blood_group":
      return "B+";
    case "valid_upto":
      return "31-03-2027";
    case "emergency_contact":
      return "+91 98765 43210";
    case "dob":
      return "14-08-2010";
    case "mobile":
      return "+91 98765 43210";
    case "address":
      return "402, Shivalik Heights, MG Road, Ahmedabad - 380015";
    case "instructions":
      return field.text || "This identity card is non-transferable and remains school property. If found, please return to school office.";
    case "custom_1":
      return "Route #14 (North)";
    case "custom_2":
      return "Emerald House";
    case "custom_3":
      return "No Known Allergies";
    default:
      return field.label;
  }
};

interface TemplateLayout {
  show_lanyard_safe_zone?: boolean;
  lanyard_safe_zone_height_mm?: number;
  custom_field_1_label?: string;
  custom_field_2_label?: string;
  custom_field_3_label?: string;
  fields: TemplateField[];
}

export default function IDCardManagementPage() {
  const [activeTab, setActiveTab] = useState<"issuance" | "builder" | "records" | "logs">("issuance");
  const [loading, setLoading] = useState(true);

  // Core Data
  const [templates, setTemplates] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);

  // Issuance State
  const [targetAudience, setTargetAudience] = useState<"STUDENT" | "STAFF">("STUDENT");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedDivision, setSelectedDivision] = useState<string>("");
  const [selectedYearId, setSelectedYearId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [printMode, setPrintMode] = useState<"PVC" | "A4_GRID">("A4_GRID");
  const [includeBackSide, setIncludeBackSide] = useState(true);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  // Pre-generation Validation State
  const [readinessData, setReadinessData] = useState<any | null>(null);
  const [checkingReadiness, setCheckingReadiness] = useState(false);
  const [isReadinessModalOpen, setIsReadinessModalOpen] = useState(false);

  // Reissue Modal State
  const [isReissueModalOpen, setIsReissueModalOpen] = useState(false);
  const [reissueCard, setReissueCard] = useState<any | null>(null);
  const [reissueReason, setReissueReason] = useState("");
  const [submittingReissue, setSubmittingReissue] = useState(false);

  // Template Builder State
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null);
  const [templateName, setTemplateName] = useState("Student ID Card Template");
  const [templateUserType, setTemplateUserType] = useState<"STUDENT" | "STAFF">("STUDENT");
  const [templateOrientation, setTemplateOrientation] = useState<"PORTRAIT" | "LANDSCAPE">("PORTRAIT");
  const [frontBgFile, setFrontBgFile] = useState<File | null>(null);
  const [backBgFile, setBackBgFile] = useState<File | null>(null);
  const [frontBgPreview, setFrontBgPreview] = useState<string>("");
  const [backBgPreview, setBackBgPreview] = useState<string>("");
  const [activeBuilderSide, setActiveBuilderSide] = useState<"front" | "back">("front");
  const [previewMode, setPreviewMode] = useState<"wireframe" | "sample">("sample");
  const [showVariableTags, setShowVariableTags] = useState(false);
  const [selectedFieldKey, setSelectedFieldKey] = useState<string>("name");
  const [savingTemplate, setSavingTemplate] = useState(false);

  const [layoutConfig, setLayoutConfig] = useState<TemplateLayout>({
    show_lanyard_safe_zone: true,
    lanyard_safe_zone_height_mm: 12,
    custom_field_1_label: "Bus Route",
    custom_field_2_label: "House Name",
    custom_field_3_label: "Allergies",
    fields: [
      { key: "photo", label: "Photograph", side: "front", visible: true, x: 30, y: 16, width: 40, height: 32, border_radius: 6 },
      { key: "name", label: "Full Name", side: "front", visible: true, x: 5, y: 51, width: 90, height: 7, font_size: 11, font_weight: "bold", font_family: "Arial, sans-serif", color: "#111827", align: "center" },
      { key: "id_no", label: "G.R. / ID No", prefix: "G.R. No: ", side: "front", visible: true, x: 5, y: 59, width: 90, height: 5, font_size: 9, font_weight: "normal", font_family: "Arial, sans-serif", color: "#4b5563", align: "center" },
      { key: "class_div", label: "Class / Dept", prefix: "Class: ", side: "front", visible: true, x: 5, y: 66, width: 90, height: 5, font_size: 9.5, font_weight: "bold", font_family: "Arial, sans-serif", color: "#2563eb", align: "center" },
      { key: "roll_no", label: "Roll Number", prefix: "Roll No: ", side: "front", visible: true, x: 5, y: 73, width: 44, height: 5, font_size: 8.5, font_weight: "normal", font_family: "Arial, sans-serif", color: "#374151", align: "center" },
      { key: "blood_group", label: "Blood Group", prefix: "Blood: ", side: "front", visible: true, x: 51, y: 73, width: 44, height: 5, font_size: 8.5, font_weight: "bold", font_family: "Arial, sans-serif", color: "#dc2626", align: "center" },
      { key: "valid_upto", label: "Valid Upto", prefix: "Valid Upto: ", side: "front", visible: true, x: 5, y: 81, width: 90, height: 5, font_size: 8, font_weight: "bold", font_family: "Arial, sans-serif", color: "#059669", align: "center" },
      { key: "emergency_contact", label: "Emergency Contact", prefix: "Emergency: ", side: "back", visible: true, x: 8, y: 16, width: 84, height: 6, font_size: 9, font_weight: "bold", font_family: "Arial, sans-serif", color: "#dc2626", align: "left" },
      { key: "dob", label: "Date of Birth", prefix: "DOB: ", side: "back", visible: true, x: 8, y: 26, width: 84, height: 6, font_size: 8.5, font_weight: "normal", font_family: "Arial, sans-serif", color: "#374151", align: "left" },
      { key: "address", label: "Address", prefix: "Address: ", side: "back", visible: true, x: 8, y: 36, width: 84, height: 16, font_size: 8, font_weight: "normal", font_family: "Arial, sans-serif", color: "#4b5563", align: "left" },
      { key: "qr_code", label: "QR / Barcode", side: "back", visible: true, x: 35, y: 55, width: 30, height: 28, align: "center" },
      { key: "instructions", label: "Instructions / Terms", text: "This identity card is non-transferable and remains school property. If found, please return to school office.", side: "back", visible: true, x: 8, y: 85, width: 84, height: 10, font_size: 6.5, font_weight: "normal", font_family: "Arial, sans-serif", color: "#6b7280", align: "center" },
    ]
  });

  // Canvas Mouse Drag State
  const canvasRef = useRef<HTMLDivElement>(null);
  const [activeDragKey, setActiveDragKey] = useState<string | null>(null);
  const dragRef = useRef<{
    key: string;
    startX: number;
    startY: number;
    initFieldX: number;
    initFieldY: number;
    fieldWidth: number;
    fieldHeight: number;
  } | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (activeTab === "records") {
      fetchRecords();
    } else if (activeTab === "logs") {
      fetchLogs();
    }
  }, [activeTab]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [tmplRes, clsRes, yrRes, studRes, staffRes] = await Promise.all([
        idCardApi.get("/templates/"),
        coreApi.get("/getclass/").catch(() => coreApi.get("/classes/")).catch(() => ({ data: [] })),
        coreApi.get("/academic-year/").catch(() => coreApi.get("/main-academic-year/")).catch(() => ({ data: [] })),
        coreApi.get("/get-student/").catch(() => ({ data: [] })),
        coreApi.get("/get-staff/").catch(() => coreApi.get("/staff/")).catch(() => ({ data: [] })),
      ]);

      const tmpls = Array.isArray(tmplRes.data) ? tmplRes.data : tmplRes.data.results || [];
      setTemplates(tmpls);
      if (tmpls.length > 0 && !selectedTemplateId) {
        const def = tmpls.find((t: any) => t.is_default && t.user_type === targetAudience) || tmpls[0];
        setSelectedTemplateId(String(def.id));
      }

      const clList = Array.isArray(clsRes.data) ? clsRes.data : clsRes.data.results || [];
      setClasses(clList);

      const yrList = Array.isArray(yrRes.data) ? yrRes.data : yrRes.data.results || [];
      setAcademicYears(yrList);

      setStudents(Array.isArray(studRes.data) ? studRes.data : studRes.data.results || []);
      setStaffList(Array.isArray(staffRes.data) ? staffRes.data : staffRes.data.results || []);
    } catch (err) {
      console.error("Failed to load ID card data:", err);
      showApiError(err, "Failed to load ID card system data.");
    } finally {
      setLoading(false);
    }
  };

  const fetchRecords = async () => {
    try {
      const res = await idCardApi.get("/records/");
      setRecords(Array.isArray(res.data) ? res.data : res.data.results || []);
    } catch (err) {
      console.error("Error fetching card records:", err);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await idCardApi.get("/logs/");
      setLogs(Array.isArray(res.data) ? res.data : res.data.results || []);
    } catch (err) {
      console.error("Error fetching audit logs:", err);
    }
  };

  // Helper to resolve human-readable Class Name (instead of raw class ID like 79, 76, 80)
  const getStudentClassName = (u: any): string => {
    // 1. If u.class_name exists as a non-purely-numeric string
    if (u.class_name && typeof u.class_name === "string" && isNaN(Number(u.class_name.trim()))) {
      return u.class_name.trim();
    }
    // 2. Lookup in classes list by ID
    const classId = u.school_class_id ?? u.school_class;
    if (classId !== undefined && classId !== null && classId !== "") {
      const found = classes.find((c: any) => String(c.id) === String(classId));
      if (found) {
        const cName = found.school_class || found.class_name;
        if (cName) return String(cName).trim();
      }
    }
    // 3. Fallback: If u.class_name exists
    if (u.class_name && typeof u.class_name === "string" && u.class_name.trim()) {
      return u.class_name.trim();
    }
    // 4. Fallback: If u.school_class is a non-numeric string
    if (u.school_class && typeof u.school_class === "string" && isNaN(Number(u.school_class.trim()))) {
      return u.school_class.trim();
    }
    return u.school_class ? `Class ${u.school_class}` : "";
  };

  const getStudentClassDiv = (u: any): string => {
    if (targetAudience === "STAFF") {
      return u.department || u.designation || "Staff";
    }
    const classNameStr = getStudentClassName(u);
    const divStr = u.division && String(u.division).trim() ? String(u.division).trim() : "";
    if (classNameStr && divStr) {
      return `${classNameStr} - ${divStr}`;
    }
    if (classNameStr) {
      return classNameStr;
    }
    if (divStr) {
      return `Div ${divStr}`;
    }
    return "N/A";
  };

  // Filtered target users
  const filteredUsers = (targetAudience === "STUDENT" ? students : staffList).filter((u) => {
    if (targetAudience === "STUDENT") {
      // 1. Class filter ("All Classes", empty, or "all" should return true)
      const isClassAll =
        !selectedClassId ||
        ["all", "all classes", "all class", ""].includes(String(selectedClassId).trim().toLowerCase());
      if (!isClassAll) {
        const sClass = String(selectedClassId).trim().toLowerCase();
        const uClass = String(u.school_class || "").trim().toLowerCase();
        const uClassId = String(u.school_class_id || "").trim().toLowerCase();
        const uClassName = String(u.class_name || "").trim().toLowerCase();
        if (uClass !== sClass && uClassId !== sClass && uClassName !== sClass) {
          return false;
        }
      }

      // 2. Division filter ("All Divisions", empty, or "all" should return true)
      const isDivAll =
        !selectedDivision ||
        ["all", "all divisions", "all division", ""].includes(String(selectedDivision).trim().toLowerCase());
      if (!isDivAll) {
        const sDiv = String(selectedDivision).trim().toLowerCase();
        const uDiv = String(u.division || "").trim().toLowerCase();
        if (uDiv !== sDiv) {
          return false;
        }
      }

      // 3. Academic Year filter ("All Academic Years", empty, or "all" should return true)
      const isYearAll =
        !selectedYearId ||
        ["all", "all academic years", "all years", "all year", ""].includes(String(selectedYearId).trim().toLowerCase());
      if (!isYearAll) {
        const selectedYrObj = academicYears.find(
          (y) => String(y.id) === String(selectedYearId) || String(y.name).trim().toLowerCase() === String(selectedYearId).trim().toLowerCase()
        );
        const targetYearId = selectedYrObj ? String(selectedYrObj.id) : String(selectedYearId);

        // Normalize year strings: e.g. "2026-2027" or "2026-27" -> "26-27"
        const normalizeYear = (yrStr: string) =>
          yrStr.toLowerCase().replace(/\s+/g, "").replace(/20(\d\d)-20(\d\d)/, "$1-$2").replace(/20(\d\d)-(\d\d)/, "$1-$2");

        const targetYearNorm = selectedYrObj ? normalizeYear(String(selectedYrObj.name)) : normalizeYear(String(selectedYearId));

        const uYearId = String(u.academic_year || u.academic_year_id || "");
        const uYearName = String(u.academic_year_name || "");
        const uYearNorm = uYearName ? normalizeYear(uYearName) : "";

        const matchYear =
          (uYearId && uYearId === targetYearId) ||
          (targetYearNorm && uYearNorm && uYearNorm === targetYearNorm);

        if (!matchYear) {
          return false;
        }
      }

      // 4. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = `${u.name || ""} ${u.surname || ""} ${u.full_name || ""}`.toLowerCase().includes(q);
        const matchGr = String(u.gr_no || "").toLowerCase().includes(q);
        const matchRoll = String(u.roll_no || "").toLowerCase().includes(q);
        const matchClass = String(u.class_name || "").toLowerCase().includes(q) || getStudentClassName(u).toLowerCase().includes(q);
        if (!matchName && !matchGr && !matchRoll && !matchClass) return false;
      }
    } else {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = String(u.name || "").toLowerCase().includes(q);
        const matchEmail = String(u.email || "").toLowerCase().includes(q);
        const matchDept = String(u.department || u.department_name || "").toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchDept) return false;
      }
    }
    return true;
  });

  // Toggle selection
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedUserIds(filteredUsers.map((u) => u.id));
    } else {
      setSelectedUserIds([]);
    }
  };

  const handleToggleSelectUser = (id: number) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Check Readiness
  const handleCheckReadiness = async () => {
    if (selectedUserIds.length === 0) {
      showWarning("Select Users", "Please select at least one person to check readiness.");
      return;
    }
    setCheckingReadiness(true);
    try {
      const res = await idCardApi.post("/records/check-readiness/", {
        user_type: targetAudience,
        user_ids: selectedUserIds,
        template_id: selectedTemplateId ? Number(selectedTemplateId) : null,
        required_fields: ["photo", "blood_group", "name"]
      });
      setReadinessData(res.data);
      setIsReadinessModalOpen(true);
    } catch (err) {
      showApiError(err, "Failed to run readiness verification.");
    } finally {
      setCheckingReadiness(false);
    }
  };

  // Generate / Preview PDF
  const handleGenerateCards = async (actionType: "PREVIEW" | "ISSUE" = "PREVIEW") => {
    if (selectedUserIds.length === 0) {
      showWarning("Select Recipients", "Please select at least one recipient.");
      return;
    }
    setGeneratingPdf(true);
    try {
      const res = await idCardApi.post("/records/generate-cards/", {
        template_id: selectedTemplateId ? Number(selectedTemplateId) : null,
        user_type: targetAudience,
        user_ids: selectedUserIds,
        print_mode: printMode,
        include_back: includeBackSide,
        action_type: actionType,
      }, {
        responseType: "blob"
      });

      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);

      if (actionType === "ISSUE") {
        showSuccess("Cards Issued Successfully", `${selectedUserIds.length} ID card(s) generated & logged.`);
        setSelectedUserIds([]);
        fetchRecords();
      }

      // Open PDF in new tab for direct printing
      window.open(url, "_blank");
    } catch (err) {
      showApiError(err, "Failed to generate ID card PDF.");
    } finally {
      setGeneratingPdf(false);
    }
  };

  // Download Single Card PDF
  const handleDownloadSinglePdf = async (cardId: number, cardNum: string) => {
    try {
      const res = await idCardApi.get(`/records/${cardId}/download-pdf/`, {
        responseType: "blob"
      });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `ID_Card_${cardNum}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showSuccess("Download Started", `ID Card ${cardNum} PDF downloaded.`);
    } catch (err) {
      showApiError(err, "Failed to download card PDF.");
    }
  };

  // Reissue Single Card
  const handleConfirmReissue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reissueCard) return;
    if (!reissueReason.trim()) {
      showWarning("Reason Required", "Please provide a reason for reissuing this ID card.");
      return;
    }
    setSubmittingReissue(true);
    try {
      await idCardApi.post(`/records/${reissueCard.id}/reissue/`, {
        reissue_reason: reissueReason.trim(),
        template_id: selectedTemplateId ? Number(selectedTemplateId) : null
      });
      showSuccess("ID Card Reissued", `New version created. Previous card marked as REISSUED.`);
      setIsReissueModalOpen(false);
      setReissueCard(null);
      setReissueReason("");
      fetchRecords();
    } catch (err) {
      showApiError(err, "Failed to reissue card.");
    } finally {
      setSubmittingReissue(false);
    }
  };

  // Status Change
  const handleUpdateStatus = async (cardId: number, statusVal: string) => {
    try {
      await idCardApi.post(`/records/${cardId}/update-status/`, {
        status: statusVal
      });
      showSuccess("Status Updated", `Card status changed to ${statusVal}.`);
      fetchRecords();
    } catch (err) {
      showApiError(err, "Failed to update status.");
    }
  };

  // Template Builder Save
  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName.trim()) {
      showWarning("Template Name", "Please enter a template name.");
      return;
    }

    setSavingTemplate(true);
    try {
      const formPayload = new FormData();
      formPayload.append("name", templateName.trim());
      formPayload.append("user_type", templateUserType);
      formPayload.append("orientation", templateOrientation);
      formPayload.append("layout_config", JSON.stringify(layoutConfig));

      if (frontBgFile) {
        formPayload.append("front_background", frontBgFile);
      }
      if (backBgFile) {
        formPayload.append("back_background", backBgFile);
      }

      if (editingTemplateId) {
        await idCardApi.patch(`/templates/${editingTemplateId}/`, formPayload, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        showSuccess("Template Updated", `Template '${templateName}' saved.`);
      } else {
        const res = await idCardApi.post("/templates/", formPayload, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        showSuccess("Template Created", `New template '${templateName}' created.`);
        if (res.data && res.data.id) {
          setSelectedTemplateId(String(res.data.id));
        }
      }

      await fetchInitialData();
      setActiveTab("issuance");
    } catch (err) {
      showApiError(err, "Failed to save template.");
    } finally {
      setSavingTemplate(false);
    }
  };

  // Template Management (Edit, New, Delete, Duplicate)
  const handleEditTemplate = (tmpl: any) => {
    if (!tmpl) return;
    setEditingTemplateId(tmpl.id);
    setTemplateName(tmpl.name);
    setTemplateUserType(tmpl.user_type);
    setTemplateOrientation(tmpl.orientation);
    setFrontBgFile(null);
    setBackBgFile(null);
    setFrontBgPreview(tmpl.front_background || "");
    setBackBgPreview(tmpl.back_background || "");
    if (tmpl.layout_config && Array.isArray(tmpl.layout_config.fields)) {
      setLayoutConfig(tmpl.layout_config);
    }
    setActiveTab("builder");
    showSuccess("Template Loaded", `Loaded '${tmpl.name}' into Visual Builder for editing.`);
  };

  const handleNewTemplate = () => {
    setEditingTemplateId(null);
    setTemplateName("New Custom ID Card Template");
    setTemplateUserType(targetAudience);
    setTemplateOrientation("PORTRAIT");
    setFrontBgFile(null);
    setBackBgFile(null);
    setFrontBgPreview("");
    setBackBgPreview("");
    setLayoutConfig({
      show_lanyard_safe_zone: true,
      lanyard_safe_zone_height_mm: 12,
      custom_field_1_label: "Bus Route",
      custom_field_2_label: "House Name",
      custom_field_3_label: "Allergies",
      fields: [
        { key: "photo", label: "Photograph", side: "front", visible: true, x: 30, y: 16, width: 40, height: 32, border_radius: 6 },
        { key: "name", label: "Full Name", side: "front", visible: true, x: 5, y: 51, width: 90, height: 7, font_size: 11, font_weight: "bold", font_family: "Arial, sans-serif", color: "#111827", align: "center" },
        { key: "id_no", label: "G.R. / ID No", prefix: "G.R. No: ", side: "front", visible: true, x: 5, y: 59, width: 90, height: 5, font_size: 9, font_weight: "normal", font_family: "Arial, sans-serif", color: "#4b5563", align: "center" },
        { key: "class_div", label: "Class / Dept", prefix: "Class: ", side: "front", visible: true, x: 5, y: 66, width: 90, height: 5, font_size: 9.5, font_weight: "bold", font_family: "Arial, sans-serif", color: "#2563eb", align: "center" },
        { key: "roll_no", label: "Roll Number", prefix: "Roll No: ", side: "front", visible: true, x: 5, y: 73, width: 44, height: 5, font_size: 8.5, font_weight: "normal", font_family: "Arial, sans-serif", color: "#374151", align: "center" },
        { key: "blood_group", label: "Blood Group", prefix: "Blood: ", side: "front", visible: true, x: 51, y: 73, width: 44, height: 5, font_size: 8.5, font_weight: "bold", font_family: "Arial, sans-serif", color: "#dc2626", align: "center" },
        { key: "valid_upto", label: "Valid Upto", prefix: "Valid Upto: ", side: "front", visible: true, x: 5, y: 81, width: 90, height: 5, font_size: 8, font_weight: "bold", font_family: "Arial, sans-serif", color: "#059669", align: "center" },
        { key: "emergency_contact", label: "Emergency Contact", prefix: "Emergency: ", side: "back", visible: true, x: 8, y: 16, width: 84, height: 6, font_size: 9, font_weight: "bold", font_family: "Arial, sans-serif", color: "#dc2626", align: "left" },
        { key: "dob", label: "Date of Birth", prefix: "DOB: ", side: "back", visible: true, x: 8, y: 26, width: 84, height: 6, font_size: 8.5, font_weight: "normal", font_family: "Arial, sans-serif", color: "#374151", align: "left" },
        { key: "address", label: "Address", prefix: "Address: ", side: "back", visible: true, x: 8, y: 36, width: 84, height: 16, font_size: 8, font_weight: "normal", font_family: "Arial, sans-serif", color: "#4b5563", align: "left" },
        { key: "qr_code", label: "QR / Barcode", side: "back", visible: true, x: 35, y: 55, width: 30, height: 28, align: "center" },
        { key: "instructions", label: "Instructions / Terms", text: "This identity card is non-transferable and remains school property. If found, please return to school office.", side: "back", visible: true, x: 8, y: 85, width: 84, height: 10, font_size: 6.5, font_weight: "normal", font_family: "Arial, sans-serif", color: "#6b7280", align: "center" }
      ]
    });
    setActiveTab("builder");
  };

  const handleDeleteTemplate = async (id: number, name: string) => {
    if (!window.confirm(`Are you sure you want to delete template "${name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await idCardApi.delete(`/templates/${id}/`);
      showSuccess("Template Deleted", `Template "${name}" has been deleted.`);
      if (editingTemplateId === id) {
        handleNewTemplate();
      }
      const res = await idCardApi.get("/templates/");
      const tmpls = Array.isArray(res.data) ? res.data : res.data.results || [];
      setTemplates(tmpls);
      const remaining = tmpls.filter((t: any) => t.user_type === targetAudience);
      if (remaining.length > 0) {
        const def = remaining.find((t: any) => t.is_default) || remaining[0];
        setSelectedTemplateId(String(def.id));
      } else {
        setSelectedTemplateId("");
      }
    } catch (err) {
      showApiError(err, "Failed to delete template.");
    }
  };

  const handleDuplicateTemplate = async (id: number) => {
    try {
      const res = await idCardApi.post(`/templates/${id}/duplicate/`);
      showSuccess("Template Cloned", "Created a copy of the template.");
      const allRes = await idCardApi.get("/templates/");
      const tmpls = Array.isArray(allRes.data) ? allRes.data : allRes.data.results || [];
      setTemplates(tmpls);
      const newTmpl = res.data;
      if (newTmpl && newTmpl.id) {
        setSelectedTemplateId(String(newTmpl.id));
        handleEditTemplate(newTmpl);
      }
    } catch (err) {
      showApiError(err, "Failed to duplicate template.");
    }
  };

  // Field manipulation in Builder
  const handleFieldPropertyChange = (key: string, prop: string, value: any) => {
    setLayoutConfig((prev) => ({
      ...prev,
      fields: prev.fields.map((f) => (f.key === key ? { ...f, [prop]: value } : f))
    }));
  };

  const handleToggleFieldVisibility = (key: string) => {
    setLayoutConfig((prev) => {
      const exists = prev.fields.some((f) => f.key === key);
      if (!exists && key === "qr_code") {
        return {
          ...prev,
          fields: [
            ...prev.fields,
            {
              key: "qr_code",
              label: "QR / Barcode",
              side: activeBuilderSide,
              visible: true,
              x: 35,
              y: 55,
              width: 30,
              height: 28,
              align: "center",
            },
          ],
        };
      }
      return {
        ...prev,
        fields: prev.fields.map((f) => (f.key === key ? { ...f, visible: !f.visible } : f))
      };
    });
  };

  // Mouse Drag & Drop for interactive canvas
  const handleFieldMouseDown = (e: React.MouseEvent, field: TemplateField) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    setSelectedFieldKey(field.key);
    setActiveDragKey(field.key);

    dragRef.current = {
      key: field.key,
      startX: e.clientX,
      startY: e.clientY,
      initFieldX: field.x,
      initFieldY: field.y,
      fieldWidth: field.width,
      fieldHeight: field.height,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!dragRef.current || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const deltaXPct = ((moveEvent.clientX - dragRef.current.startX) / rect.width) * 100;
      const deltaYPct = ((moveEvent.clientY - dragRef.current.startY) / rect.height) * 100;

      const maxX = Math.max(0, 100 - dragRef.current.fieldWidth);
      const maxY = Math.max(0, 100 - dragRef.current.fieldHeight);

      const nextX = Math.max(0, Math.min(maxX, dragRef.current.initFieldX + deltaXPct));
      const nextY = Math.max(0, Math.min(maxY, dragRef.current.initFieldY + deltaYPct));

      const roundedX = Math.round(nextX * 10) / 10;
      const roundedY = Math.round(nextY * 10) / 10;

      setLayoutConfig((prev) => ({
        ...prev,
        fields: prev.fields.map((f) =>
          f.key === dragRef.current?.key ? { ...f, x: roundedX, y: roundedY } : f
        ),
      }));
    };

    const handleMouseUp = () => {
      dragRef.current = null;
      setActiveDragKey(null);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const selectedField = layoutConfig.fields.find((f) => f.key === selectedFieldKey);
  const selectedTemplateObj = templates.find((t) => String(t.id) === String(selectedTemplateId));
  const isPortrait = templateOrientation === "PORTRAIT";

  // Canvas aspect ratio styles
  const canvasWidthPx = isPortrait ? 300 : 460;
  const canvasHeightPx = isPortrait ? 480 : 290;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Contact className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            School-Wise ID Card Management
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Design multi-tenant card templates, verify recipient readiness, generate CR80 PVC / A4 grid print layouts, and manage card lifecycle.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleNewTemplate}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-md shadow-indigo-500/20 active:scale-95 transition-all"
          >
            <Palette className="w-4 h-4" /> Open Template Builder
          </button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab("issuance")}
          className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === "issuance"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          <CreditCard className="w-4 h-4" /> Card Issuance Desk
        </button>

        <button
          onClick={() => setActiveTab("builder")}
          className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === "builder"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          <Palette className="w-4 h-4" /> Visual Template Builder
        </button>

        <button
          onClick={() => setActiveTab("records")}
          className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === "records"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          <FileText className="w-4 h-4" /> Issued Cards Directory ({records.length})
        </button>

        <button
          onClick={() => setActiveTab("logs")}
          className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === "logs"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          <History className="w-4 h-4" /> Audit & Reissue Logs
        </button>
      </div>

      {/* TAB 1: CARD ISSUANCE DESK */}
      {activeTab === "issuance" && (
        <div className="space-y-6">
          {/* Controls & Filter Panel */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Target Audience Toggle */}
              <div className="inline-flex rounded-xl p-1 bg-slate-100 dark:bg-slate-800">
                <button
                  onClick={() => { setTargetAudience("STUDENT"); setSelectedUserIds([]); }}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                    targetAudience === "STUDENT"
                      ? "bg-white dark:bg-slate-900 text-indigo-600 shadow-sm"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Students ({students.length})
                </button>
                <button
                  onClick={() => { setTargetAudience("STAFF"); setSelectedUserIds([]); }}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                    targetAudience === "STAFF"
                      ? "bg-white dark:bg-slate-900 text-indigo-600 shadow-sm"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Teachers & Staff ({staffList.length})
                </button>
              </div>

              {/* Template Selector & Management Actions */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">Active Template:</span>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">Select Template</option>
                  {templates.filter((t) => t.user_type === targetAudience).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.orientation}) {t.is_default ? "★ Default" : ""}
                    </option>
                  ))}
                </select>

                {selectedTemplateObj && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleEditTemplate(selectedTemplateObj)}
                      title="Edit this template in Visual Builder"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60 transition-all shadow-xs"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDuplicateTemplate(selectedTemplateObj.id)}
                      title="Clone / Duplicate this template"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all shadow-xs"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Clone</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteTemplate(selectedTemplateObj.id, selectedTemplateObj.name)}
                      title="Delete this template"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 transition-all shadow-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleNewTemplate}
                  title="Create a new ID card template"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 transition-all shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-600" />
                  <span>New Template</span>
                </button>
              </div>
            </div>

            {/* Sub-Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              {targetAudience === "STUDENT" ? (
                <>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Class</label>
                    <select
                      value={selectedClassId}
                      onChange={(e) => setSelectedClassId(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                    >
                      <option value="">All Classes</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>{c.school_class || c.class_name || `Class ${c.id}`}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Division</label>
                    <select
                      value={selectedDivision}
                      onChange={(e) => setSelectedDivision(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                    >
                      <option value="">All Divisions</option>
                      {Array.from(new Set(students.map((s) => s.division).filter(Boolean))).length > 0 ? (
                        Array.from(new Set(students.map((s) => String(s.division).toUpperCase()).filter(Boolean)))
                          .sort()
                          .map((div) => (
                            <option key={div} value={div}>
                              Division {div}
                            </option>
                          ))
                      ) : (
                        <>
                          <option value="A">Division A</option>
                          <option value="B">Division B</option>
                          <option value="C">Division C</option>
                          <option value="D">Division D</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Academic Year</label>
                    <select
                      value={selectedYearId}
                      onChange={(e) => setSelectedYearId(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                    >
                      <option value="">All Academic Years</option>
                      {academicYears.map((y) => (
                        <option key={y.id} value={y.id}>{y.name}</option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <div className="sm:col-span-3 text-xs text-slate-500 flex items-center">
                  Showing all registered academic and administrative staff members.
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Search Recipient</label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search name, GR or ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Bar & Print Layout Selector */}
          <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                {selectedUserIds.length} recipient(s) selected
              </span>

              <button
                type="button"
                onClick={handleCheckReadiness}
                disabled={checkingReadiness || selectedUserIds.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 transition-all disabled:opacity-50"
              >
                {checkingReadiness ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                Run Pre-generation Checklist
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Dual Print Mode Picker */}
              <div className="inline-flex rounded-lg p-0.5 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 text-xs">
                <button
                  type="button"
                  onClick={() => setPrintMode("PVC")}
                  className={`px-3 py-1 rounded-md font-semibold transition-all ${
                    printMode === "PVC"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-300 hover:text-indigo-600"
                  }`}
                  title="CR80 PVC size: 86x54mm single card format"
                >
                  CR80 PVC Single
                </button>
                <button
                  type="button"
                  onClick={() => setPrintMode("A4_GRID")}
                  className={`px-3 py-1 rounded-md font-semibold transition-all ${
                    printMode === "A4_GRID"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-300 hover:text-indigo-600"
                  }`}
                  title="A4 Sheet grid: 8-10 cards per page with crop marks"
                >
                  A4 Grid (8-10 / Sheet)
                </button>
              </div>

              <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeBackSide}
                  onChange={(e) => setIncludeBackSide(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600"
                />
                Include Back
              </label>

              <button
                type="button"
                onClick={() => handleGenerateCards("PREVIEW")}
                disabled={generatingPdf || selectedUserIds.length === 0}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 transition-all shadow-xs disabled:opacity-50"
              >
                <Eye className="w-3.5 h-3.5" /> Preview PDF
              </button>

              <button
                type="button"
                onClick={() => handleGenerateCards("ISSUE")}
                disabled={generatingPdf || selectedUserIds.length === 0}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 active:scale-95 transition-all disabled:opacity-50"
              >
                {generatingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
                Confirm & Issue ID Cards
              </button>
            </div>
          </div>

          {/* Recipients Table */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4 w-10">
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={filteredUsers.length > 0 && selectedUserIds.length === filteredUsers.length}
                      className="rounded border-slate-300 text-indigo-600"
                    />
                  </th>
                  <th className="py-3 px-4">Recipient</th>
                  <th className="py-3 px-4">Identifier / G.R. No</th>
                  <th className="py-3 px-4">{targetAudience === "STUDENT" ? "Class & Div" : "Department"}</th>
                  <th className="py-3 px-4">Blood Group</th>
                  <th className="py-3 px-4">Emergency Contact</th>
                  <th className="py-3 px-4">Photo Status</th>
                  <th className="py-3 px-4 text-right">Card Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      <img
                        src="/images/empty-folder.png"
                        alt="No recipients found"
                        className="mx-auto mb-3 h-24 w-24 object-contain"
                      />
                      <div className="font-semibold text-slate-700 text-sm">No matching recipients found</div>
                      <p className="text-xs text-slate-400 mt-1">Try adjusting the class, division, or search query above.</p>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isSelected = selectedUserIds.includes(u.id);
                    const name = targetAudience === "STUDENT" ? `${u.name || ""} ${u.surname || ""}`.trim() : (u.name || "Staff");
                    const idNo = targetAudience === "STUDENT" ? (u.gr_no || u.roll_no || `STU-${u.id}`) : `EMP-${u.id}`;
                    const classDiv = getStudentClassDiv(u);
                    const blood = u.blood_group || "N/A";
                    const emergency = u.emergency_contact || u.mobile || "N/A";
                    const hasPhoto = !!u.photo_url;

                    return (
                      <tr
                        key={u.id}
                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                          isSelected ? "bg-indigo-50/40 dark:bg-indigo-950/20" : ""
                        }`}
                      >
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectUser(u.id)}
                            className="rounded border-slate-300 text-indigo-600"
                          />
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                          {name}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-500">
                          {idNo}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                          {classDiv}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-bold ${
                            blood !== "N/A"
                              ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                              : "bg-slate-100 text-slate-400 dark:bg-slate-800"
                          }`}>
                            {blood}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                          {emergency}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                            hasPhoto ? "text-emerald-600" : "text-amber-600"
                          }`}>
                            {hasPhoto ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                            {hasPhoto ? "Available" : "Missing"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            Ready
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: VISUAL TEMPLATE BUILDER */}
      {activeTab === "builder" && (
        <div className="space-y-6">
          <form onSubmit={handleSaveTemplate} noValidate className="space-y-6">
            {/* Top Template Settings Card */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Sliders className="w-5 h-5 text-indigo-600" />
                      Template Specifications & Orientation
                    </h3>
                    {editingTemplateId ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                        Editing: {templateName} (#{editingTemplateId})
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <Plus className="w-3.5 h-3.5 text-emerald-600" />
                        Creating New Template
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    Upload blank PVC background cards and arrange dynamic fields with precise X/Y coordinate positioning.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Quick Switch / Load Template */}
                  <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <span className="text-[11px] font-semibold text-slate-500">Load Template:</span>
                    <select
                      value={editingTemplateId || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!val) {
                          handleNewTemplate();
                        } else {
                          const tmpl = templates.find((t) => String(t.id) === val);
                          if (tmpl) handleEditTemplate(tmpl);
                        }
                      }}
                      className="text-xs font-semibold bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none max-w-[200px] truncate"
                    >
                      <option value="">+ New Template</option>
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.user_type} - {t.orientation})
                        </option>
                      ))}
                    </select>
                  </div>

                  {editingTemplateId && (
                    <>
                      <button
                        type="button"
                        onClick={handleNewTemplate}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5 text-indigo-600" />
                        New Template
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTemplate(editingTemplateId, templateName)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-xs font-semibold transition-all shadow-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete Template
                      </button>
                    </>
                  )}

                  <button
                    type="submit"
                    disabled={savingTemplate}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {savingTemplate ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    {editingTemplateId ? "Save Changes" : "Save Template Configuration"}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Template Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Standard Student PVC ID 2026"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Target User Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={templateUserType}
                    onChange={(e) => setTemplateUserType(e.target.value as any)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                  >
                    <option value="STUDENT">Students</option>
                    <option value="STAFF">Teachers & Non-Teaching Staff</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Card Orientation (CR80 PVC) <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTemplateOrientation("PORTRAIT")}
                      className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                        templateOrientation === "PORTRAIT"
                          ? "border-indigo-600 bg-indigo-50/50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300"
                          : "border-slate-200 dark:border-slate-800 text-slate-600"
                      }`}
                    >
                      Portrait (54x86mm)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTemplateOrientation("LANDSCAPE")}
                      className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                        templateOrientation === "LANDSCAPE"
                          ? "border-indigo-600 bg-indigo-50/50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300"
                          : "border-slate-200 dark:border-slate-800 text-slate-600"
                      }`}
                    >
                      Landscape (86x54mm)
                    </button>
                  </div>
                </div>
              </div>

              {/* Background Uploads */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="p-3.5 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-indigo-500" />
                      Front Background Image
                    </span>
                    {frontBgPreview && (
                      <button
                        type="button"
                        onClick={() => { setFrontBgFile(null); setFrontBgPreview(""); }}
                        className="text-[11px] text-red-500 hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setFrontBgFile(file);
                        setFrontBgPreview(URL.createObjectURL(file));
                      }
                    }}
                    className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700"
                  />
                  <p className="text-[10px] text-slate-400">
                    Recommended resolution: 1012 x 638 px (300 DPI CR80 card).
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-purple-500" />
                      Back Background Image
                    </span>
                    {backBgPreview && (
                      <button
                        type="button"
                        onClick={() => { setBackBgFile(null); setBackBgPreview(""); }}
                        className="text-[11px] text-red-500 hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setBackBgFile(file);
                        setBackBgPreview(URL.createObjectURL(file));
                      }
                    }}
                    className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-purple-50 file:text-purple-700"
                  />
                  <p className="text-[10px] text-slate-400">
                    Upload for dual-sided PVC card printing (Terms, QR code, Emergency contact).
                  </p>
                </div>
              </div>
            </div>

            {/* Visual Canvas & Interactive Controls Section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Visual Canvas */}
              <div className="lg:col-span-7 space-y-4">
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                  {/* Canvas Toolbar */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="inline-flex rounded-xl p-1 bg-slate-100 dark:bg-slate-800 text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => setActiveBuilderSide("front")}
                        className={`px-3.5 py-1.5 rounded-lg transition-all ${
                          activeBuilderSide === "front"
                            ? "bg-white dark:bg-slate-900 text-indigo-600 shadow-xs"
                            : "text-slate-500"
                        }`}
                      >
                        Front Side
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveBuilderSide("back")}
                        className={`px-3.5 py-1.5 rounded-lg transition-all ${
                          activeBuilderSide === "back"
                            ? "bg-white dark:bg-slate-900 text-indigo-600 shadow-xs"
                            : "text-slate-500"
                        }`}
                      >
                        Back Side
                      </button>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-semibold cursor-pointer px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                        <input
                          type="checkbox"
                          checked={showVariableTags}
                          onChange={(e) => setShowVariableTags(e.target.checked)}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        Show Variable Tags
                      </label>

                      <label className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          checked={layoutConfig.show_lanyard_safe_zone}
                          onChange={(e) =>
                            setLayoutConfig((prev) => ({
                              ...prev,
                              show_lanyard_safe_zone: e.target.checked
                            }))
                          }
                          className="rounded text-indigo-600"
                        />
                        Lanyard Hole Safe Zone
                      </label>

                      <div className="inline-flex rounded-lg p-0.5 bg-slate-100 dark:bg-slate-800 text-xs">
                        <button
                          type="button"
                          onClick={() => setPreviewMode("sample")}
                          className={`px-2.5 py-1 rounded font-semibold ${
                            previewMode === "sample" ? "bg-white dark:bg-slate-900 text-indigo-600 shadow-xs" : "text-slate-500"
                          }`}
                        >
                          Sample
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewMode("wireframe")}
                          className={`px-2.5 py-1 rounded font-semibold ${
                            previewMode === "wireframe" ? "bg-white dark:bg-slate-900 text-indigo-600 shadow-xs" : "text-slate-500"
                          }`}
                        >
                          Wireframe
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Interactive Card Canvas */}
                  <div className="flex justify-center items-center py-6 bg-slate-100 dark:bg-slate-950/60 rounded-xl overflow-auto min-h-[420px]">
                    <div
                      ref={canvasRef}
                      style={{
                        width: `${canvasWidthPx}px`,
                        height: `${canvasHeightPx}px`,
                        backgroundImage:
                          activeBuilderSide === "front"
                            ? frontBgPreview
                              ? `url(${frontBgPreview})`
                              : "linear-gradient(135deg, #1e3a8a 0%, #1e1b4b 100%)"
                            : backBgPreview
                            ? `url(${backBgPreview})`
                            : "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }}
                      className="relative rounded-2xl shadow-xl border-2 border-slate-300 dark:border-slate-700 overflow-hidden select-none"
                    >
                      {/* Lanyard Hole Safe Zone indicator */}
                      {layoutConfig.show_lanyard_safe_zone && activeBuilderSide === "front" && (
                        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-3.5 rounded-full border-2 border-dashed border-white/60 bg-black/20 flex items-center justify-center pointer-events-none z-20">
                          <span className="text-[8px] text-white/80 font-bold tracking-widest uppercase">PUNCH</span>
                        </div>
                      )}

                      {/* Header bar in sample mode if no background */}
                      {!frontBgPreview && activeBuilderSide === "front" && (
                        <div className="w-full pt-4 pb-2 text-center text-white font-bold text-xs tracking-wider uppercase border-b border-white/10">
                          SCHOOL MANAGEMENT ACADEMY
                        </div>
                      )}

                      {/* Render Dynamic Fields */}
                      {layoutConfig.fields
                        .filter((f) => f.side === activeBuilderSide && f.visible)
                        .map((f) => {
                          const isSelected = selectedFieldKey === f.key;
                          const isBeingDragged = activeDragKey === f.key;
                          const isPhoto = f.key === "photo";
                          const isQr = f.key === "qr_code";
                          const isInstructions = f.key === "instructions";
                          const isAddress = f.key === "address";

                          const isNoPrefix = NO_PREFIX_FIELDS.has(f.key.toLowerCase());
                          const varTag = FIELD_VARIABLE_TAGS[f.key] || `{{${f.key}}}`;
                          const sampleVal = getFieldSampleValue(f);
                          const effectivePrefix = isNoPrefix ? undefined : f.prefix;
                          const textToShow = showVariableTags
                            ? formatWithPrefix(effectivePrefix, varTag)
                            : formatWithPrefix(effectivePrefix, sampleVal);

                          return (
                            <div
                              key={f.key}
                              onMouseDown={(e) => handleFieldMouseDown(e, f)}
                              style={{
                                left: `${f.x}%`,
                                top: `${f.y}%`,
                                width: `${f.width}%`,
                                height: `${f.height}%`,
                                maxWidth: `${100 - f.x}%`,
                                maxHeight: `${100 - f.y}%`,
                                color: f.color || (activeBuilderSide === "front" && !frontBgPreview ? "#ffffff" : "#111827"),
                                fontFamily: f.font_family || "Arial, sans-serif",
                                fontSize: `${f.font_size || 9}px`,
                                fontWeight: f.font_weight || "normal",
                                textAlign: f.align || "left",
                                borderRadius: `${f.border_radius || 0}px`,
                              }}
                              className={`absolute cursor-grab active:cursor-grabbing flex items-center select-none overflow-hidden transition-shadow ${
                                isSelected
                                  ? "ring-2 ring-indigo-500 shadow-md bg-indigo-500/15 z-20"
                                  : "hover:ring-1 hover:ring-indigo-300 z-10"
                              } ${isBeingDragged ? "opacity-90 ring-2 ring-indigo-600 scale-[1.01]" : ""} ${
                                previewMode === "wireframe" ? "border border-dashed border-indigo-400 bg-indigo-50/20" : ""
                              }`}
                            >
                              {isPhoto ? (
                                <div
                                  style={{ aspectRatio: "3/4" }}
                                  className="w-full h-full max-h-full mx-auto rounded overflow-hidden flex flex-col items-center justify-center border border-slate-300 dark:border-slate-600 bg-slate-200 dark:bg-slate-800 shadow-xs"
                                >
                                  <div className="relative w-full h-full flex flex-col items-center justify-center bg-slate-300 dark:bg-slate-700">
                                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                                      <ImageIcon className="w-5 h-5 text-slate-400 mb-0.5" />
                                      <span className="text-[7.5px] font-bold tracking-wider uppercase">
                                        {showVariableTags ? "{{photo_3:4}}" : "PHOTO (3:4)"}
                                      </span>
                                    </div>
                                    <div className="absolute bottom-0 inset-x-0 bg-black/60 py-0.5 text-center text-[6.5px] text-white font-mono uppercase tracking-widest">
                                      CR80 PASSPORT
                                    </div>
                                  </div>
                                </div>
                              ) : isQr ? (
                                <div className="w-full h-full bg-white p-1 rounded flex flex-col items-center justify-center shadow-xs border border-slate-200">
                                  <QrCode className="w-full h-full text-slate-900" />
                                  <span className="text-[6px] font-mono font-bold text-slate-600 uppercase tracking-tighter mt-0.5">
                                    {showVariableTags ? "{{qr_code}}" : "QR / BARCODE"}
                                  </span>
                                </div>
                              ) : isInstructions ? (
                                <span className="text-[7px] leading-tight text-center text-slate-500 line-clamp-3 overflow-hidden text-ellipsis break-words w-full">
                                  {showVariableTags ? "{{instructions_text}}" : f.text}
                                </span>
                              ) : (
                                <span
                                  className={`w-full overflow-hidden text-ellipsis ${
                                    isAddress
                                      ? "line-clamp-2 break-words leading-tight"
                                      : "whitespace-nowrap"
                                  }`}
                                >
                                  {textToShow}
                                </span>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Field Customizer & Coordinates Inspector */}
              <div className="lg:col-span-5 space-y-4">
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-indigo-600" />
                    Field Inspector & Coordinate Mapper
                  </h3>

                  {selectedField ? (
                    <div className="space-y-4 text-xs">
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">{selectedField.label}</div>
                          <div className="text-[11px] text-slate-400">Key: {selectedField.key} · Side: {selectedField.side}</div>
                        </div>

                        <label className="inline-flex items-center gap-1.5 cursor-pointer font-semibold">
                          <input
                            type="checkbox"
                            checked={selectedField.visible}
                            onChange={() => handleToggleFieldVisibility(selectedField.key)}
                            className="rounded text-indigo-600"
                          />
                          Visible
                        </label>
                      </div>

                      {/* X and Y coordinate sliders */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                            X Position ({selectedField.x}%)
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="95"
                            value={selectedField.x}
                            onChange={(e) => handleFieldPropertyChange(selectedField.key, "x", Number(e.target.value))}
                            className="w-full"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                            Y Position ({selectedField.y}%)
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="95"
                            value={selectedField.y}
                            onChange={(e) => handleFieldPropertyChange(selectedField.key, "y", Number(e.target.value))}
                            className="w-full"
                          />
                        </div>
                      </div>

                      {/* Width and Height */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                            Width ({selectedField.width}%)
                          </label>
                          <input
                            type="range"
                            min="5"
                            max="100"
                            value={selectedField.width}
                            onChange={(e) => handleFieldPropertyChange(selectedField.key, "width", Number(e.target.value))}
                            className="w-full"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                            Height ({selectedField.height}%)
                          </label>
                          <input
                            type="range"
                            min="3"
                            max="80"
                            value={selectedField.height}
                            onChange={(e) => handleFieldPropertyChange(selectedField.key, "height", Number(e.target.value))}
                            className="w-full"
                          />
                        </div>
                      </div>

                      {/* Card Side and Corner Radius */}
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1">Assigned Side</label>
                          <select
                            value={selectedField.side}
                            onChange={(e) => {
                              const newSide = e.target.value as "front" | "back";
                              handleFieldPropertyChange(selectedField.key, "side", newSide);
                              setActiveBuilderSide(newSide);
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-semibold"
                          >
                            <option value="front">Front Side</option>
                            <option value="back">Back Side</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1">Corner Radius (px)</label>
                          <input
                            type="number"
                            min="0"
                            max="24"
                            value={selectedField.border_radius || 0}
                            onChange={(e) => handleFieldPropertyChange(selectedField.key, "border_radius", Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs"
                          />
                        </div>
                      </div>

                      {/* Typography & Styling */}
                      {selectedField.key !== "photo" && selectedField.key !== "qr_code" && (
                        <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                          {/* Font Family Selection */}
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                                Font Family
                              </label>
                              <select
                                value={selectedField.font_family || "Arial, sans-serif"}
                                onChange={(e) => handleFieldPropertyChange(selectedField.key, "font_family", e.target.value)}
                                className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-medium"
                              >
                                {FONT_FAMILIES.map((font) => (
                                  <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                                    {font.label}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                                Font Weight
                              </label>
                              <select
                                value={selectedField.font_weight || "normal"}
                                onChange={(e) => handleFieldPropertyChange(selectedField.key, "font_weight", e.target.value)}
                                className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-medium"
                              >
                                <option value="normal">Normal</option>
                                <option value="bold">Bold (Heavy)</option>
                              </select>
                            </div>
                          </div>

                          {/* Text Prefix / Label (Hidden for full_name, photo, qr_code, barcode, instructions) */}
                          {!NO_PREFIX_FIELDS.has(selectedField.key.toLowerCase()) && (
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="block text-[11px] font-semibold text-slate-500">
                                  Text Prefix / Label
                                </label>
                                <span className="text-[10px] text-slate-400">Auto-spaced</span>
                              </div>
                              <input
                                type="text"
                                value={selectedField.prefix || ""}
                                onChange={(e) => handleFieldPropertyChange(selectedField.key, "prefix", e.target.value)}
                                placeholder="e.g. Blood: or Roll No: "
                                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs"
                              />
                            </div>
                          )}

                          {selectedField.key === "instructions" && (
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                                Notice / Instructions Text
                              </label>
                              <textarea
                                rows={3}
                                value={selectedField.text || ""}
                                onChange={(e) => handleFieldPropertyChange(selectedField.key, "text", e.target.value)}
                                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs"
                              />
                            </div>
                          )}

                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Font Size</label>
                              <input
                                type="number"
                                min="6"
                                max="24"
                                value={selectedField.font_size || 9}
                                onChange={(e) => handleFieldPropertyChange(selectedField.key, "font_size", Number(e.target.value))}
                                className="w-full px-2 py-1 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Color</label>
                              <input
                                type="color"
                                value={selectedField.color || "#111827"}
                                onChange={(e) => handleFieldPropertyChange(selectedField.key, "color", e.target.value)}
                                className="w-full h-7 rounded cursor-pointer"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Align</label>
                              <select
                                value={selectedField.align || "left"}
                                onChange={(e) => handleFieldPropertyChange(selectedField.key, "align", e.target.value)}
                                className="w-full px-2 py-1 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs"
                              >
                                <option value="left">Left</option>
                                <option value="center">Center</option>
                                <option value="right">Right</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-6 text-center text-slate-400 text-xs">
                      Click any field on the canvas to inspect and customize its coordinates and appearance.
                    </div>
                  )}

                  {/* All Fields List & Toggles */}
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Standard & Dynamic Field Toggles
                      </span>
                      <span className="text-[10px] text-slate-400">Click to Select / Toggle</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                      {layoutConfig.fields.map((f) => (
                        <div
                          key={f.key}
                          className={`flex items-center justify-between p-2 rounded-lg border text-left text-[11px] transition-all ${
                            selectedFieldKey === f.key
                              ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 font-bold text-indigo-700"
                              : "border-slate-200 dark:border-slate-800 hover:bg-slate-50"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => { setSelectedFieldKey(f.key); setActiveBuilderSide(f.side); }}
                            className="flex-1 truncate text-left mr-1 flex items-center gap-1.5"
                          >
                            {f.key === "qr_code" ? (
                              <QrCode className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            ) : f.key === "photo" ? (
                              <ImageIcon className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            ) : null}
                            <span className="truncate">{f.label}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleFieldVisibility(f.key)}
                            title={f.visible ? "Hide field" : "Show field"}
                            className="p-1 hover:scale-110 transition-transform"
                          >
                            <span className={`block w-2.5 h-2.5 rounded-full ${f.visible ? "bg-emerald-500 shadow-xs shadow-emerald-500/50" : "bg-slate-300"}`} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: ISSUED CARDS DIRECTORY */}
      {activeTab === "records" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              Issued ID Cards Master Records
            </h3>
            <button
              onClick={fetchRecords}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
            >
              Refresh
            </button>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Card #</th>
                  <th className="py-3 px-4">Recipient</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Template</th>
                  <th className="py-3 px-4">Version</th>
                  <th className="py-3 px-4">Issue Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      <img
                        src="/images/empty-folder.png"
                        alt="No issued cards"
                        className="mx-auto mb-3 h-24 w-24 object-contain"
                      />
                      <div className="font-semibold text-slate-700 text-sm">No cards issued yet</div>
                      <p className="text-xs text-slate-400 mt-1">Use the Card Issuance Desk above to generate and issue ID cards.</p>
                    </td>
                  </tr>
                ) : (
                  records.map((r) => {
                    const recipientName = r.student ? `${r.student_name} (${r.student_class || ""})` : r.staff_name;
                    return (
                      <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-indigo-600">
                          {r.card_number}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                          {recipientName}
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {r.user_type}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {r.template_name}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-slate-100 text-slate-700">
                            v{r.version}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {r.issue_date}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            r.card_status === "ISSUED"
                              ? "bg-emerald-100 text-emerald-700"
                              : r.card_status === "REISSUED"
                              ? "bg-purple-100 text-purple-700"
                              : r.card_status === "LOST_DAMAGED"
                              ? "bg-rose-100 text-rose-700"
                              : "bg-amber-100 text-amber-700"
                          }`}>
                            {r.card_status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right space-x-1">
                          <button
                            onClick={() => handleDownloadSinglePdf(r.id, r.card_number)}
                            title="Download Single Card PVC PDF"
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => { setReissueCard(r); setIsReissueModalOpen(true); }}
                            title="Reissue Card with Version History"
                            className="p-1.5 rounded-lg border border-purple-200 text-purple-600 hover:bg-purple-50"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                          {r.card_status === "ISSUED" && (
                            <button
                              onClick={() => handleUpdateStatus(r.id, "LOST_DAMAGED")}
                              title="Mark as Lost / Damaged"
                              className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"
                            >
                              <ShieldAlert className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: AUDIT & REISSUE LOGS */}
      {activeTab === "logs" && (
        <div className="space-y-4">
          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Card #</th>
                  <th className="py-3 px-4">Recipient</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Remarks / Reissue Reason</th>
                  <th className="py-3 px-4 text-right">Performed By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No audit logs recorded yet.
                    </td>
                  </tr>
                ) : (
                  logs.map((l) => (
                    <tr key={l.id}>
                      <td className="py-3 px-4 text-slate-400 font-mono">
                        {new Date(l.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-indigo-600">
                        {l.card_number}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                        {l.target_name}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex px-2 py-0.5 rounded font-bold text-[10px] bg-slate-100 text-slate-700">
                          {l.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        {l.remarks || "—"}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-500">
                        {l.performed_by_name || "Admin"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: PRE-GENERATION READINESS CHECKLIST */}
      {isReadinessModalOpen && readinessData && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-indigo-600" />
                Pre-Generation Data Quality Checklist
              </h2>
              <button onClick={() => setIsReadinessModalOpen(false)} className="p-1 rounded text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border">
                  <div className="text-lg font-bold text-slate-900 dark:text-white">{readinessData.total_count}</div>
                  <div className="text-[11px] text-slate-400">Total Checked</div>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200">
                  <div className="text-lg font-bold text-emerald-600">{readinessData.ready_count}</div>
                  <div className="text-[11px] text-emerald-700 dark:text-emerald-300">Ready to Print</div>
                </div>
                <div className="p-3 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200">
                  <div className="text-lg font-bold text-rose-600">{readinessData.missing_count}</div>
                  <div className="text-[11px] text-rose-700 dark:text-rose-300">Missing Critical Data</div>
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 font-bold text-slate-500">
                    <tr>
                      <th className="p-2.5">Name</th>
                      <th className="p-2.5">Status</th>
                      <th className="p-2.5">Missing Fields</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {readinessData.users.map((u: any) => (
                      <tr key={u.id}>
                        <td className="p-2.5 font-bold">{u.name}</td>
                        <td className="p-2.5">
                          <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                            u.is_ready ? "text-emerald-600" : "text-rose-600"
                          }`}>
                            {u.is_ready ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                            {u.is_ready ? "Complete" : "Incomplete"}
                          </span>
                        </td>
                        <td className="p-2.5 text-rose-600 font-semibold">
                          {u.missing_fields?.length > 0 ? u.missing_fields.join(", ") : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsReadinessModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: REISSUE CARD MODAL */}
      {isReissueModalOpen && reissueCard && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-purple-600" />
                Reissue ID Card (v{reissueCard.version + 1})
              </h2>
              <button onClick={() => setIsReissueModalOpen(false)} className="p-1 rounded text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmReissue} noValidate className="p-6 space-y-4">
              <div className="p-3.5 rounded-xl bg-purple-50/50 dark:bg-purple-950/30 border border-purple-200/60 text-xs space-y-1">
                <div><span className="text-slate-500">Recipient:</span> <span className="font-bold">{reissueCard.student_name || reissueCard.staff_name}</span></div>
                <div><span className="text-slate-500">Previous Card:</span> <span className="font-mono">{reissueCard.card_number} (v{reissueCard.version})</span></div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Reason for Reissuance <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={reissueReason}
                  onChange={(e) => setReissueReason(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                >
                  <option value="">Select Reason</option>
                  <option value="Lost Card">Lost Card</option>
                  <option value="Damaged / Broken">Damaged / Broken</option>
                  <option value="Student Promoted to Next Class">Student Promoted to Next Class</option>
                  <option value="Information / Photo Correction">Information / Photo Correction</option>
                  <option value="Expired Card Renewal">Expired Card Renewal</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsReissueModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReissue}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-500/20 active:scale-95 transition-all disabled:opacity-50"
                >
                  {submittingReissue ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Confirm & Reissue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
