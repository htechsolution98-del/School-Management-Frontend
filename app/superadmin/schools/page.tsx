"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useConfirm } from "@/components/providers/confirm-provider";
import {
  Plus,
  Users,
  Mail,
  Phone,
  MapPin,
  Globe,
  Loader2,
  Building2,
  X,
  RefreshCw,
  Hash,
  Edit2,
  Trash2,
  Power,
  Image,
  Sparkles,
  Search,
  CheckCircle2,
  AlertCircle,
  School as SchoolIcon,
  GraduationCap,
  Briefcase,
  Layers,
  ChevronRight,
  BarChart3,
  PieChart as PieChartIcon,
} from "lucide-react";

import {
  getSchools,
  createSchool,
  updateSchool,
  deleteSchool,
  updateFeatureStatus,
  createSchoolFeature,
  fetchFeaturesList,
  getSchoolDetails,
  SchoolDetailedStats,
} from "@/lib/superadmin";

import { CreateSchoolPayload, School } from "@/types";

const EMPTY_FORM: CreateSchoolPayload = {
  name: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  country: "",
  pincode: "",
  index_no: "",
  feature_ids: [],
  is_active: true,
};

type Feature = {
  id: number;
  name: string;
  is_enabled?: boolean;
};

type FormFieldKey = Exclude<
  keyof CreateSchoolPayload,
  "is_active" | "feature_ids"
>;

export default function SuperAdminSchoolsPage() {
  const confirm = useConfirm();
  const [schools, setSchools] = useState<School[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [features, setFeatures] = useState<Feature[]>([]);
  const [selectedFeatures, setSelectedFeatures] = useState<number[]>([]);
  const [editingSchoolId, setEditingSchoolId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  /* Modal state for Feature assignment */
  const [isFeatureModalOpen, setIsFeatureModalOpen] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [loadingFeatureId, setLoadingFeatureId] = useState<number | null>(null);

  /* Modal state for School Specific Demographics & Telemetry */
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [schoolStats, setSchoolStats] = useState<SchoolDetailedStats | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchSchools = useCallback(async () => {
    setIsFetching(true);
    setError("");
    try {
      const data = await getSchools();
      const formattedSchools = data.map((school: School) => ({
        ...school,
        feature_ids: school.school_features?.map((item) => item.feature) || [],
      }));
      setSchools(formattedSchools);
    } catch (err: any) {
      setError(err.message || "Failed to load schools.");
    } finally {
      setIsFetching(false);
    }
  }, []);

  const fetchFeatures = useCallback(async () => {
    try {
      const data = await fetchFeaturesList();
      setFeatures(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load features");
    }
  }, []);

  useEffect(() => {
    fetchSchools();
    fetchFeatures();
  }, [fetchSchools, fetchFeatures]);

  const handleOpenSchoolStats = async (schoolId: number) => {
    setLoadingDetail(true);
    setIsDetailModalOpen(true);
    try {
      const details = await getSchoolDetails(schoolId);
      setSchoolStats(details);
    } catch (err: any) {
      console.error("Failed to load school details:", err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!(await confirm("Are you sure you want to delete this school? All associated data will be removed."))) return;
    try {
      await deleteSchool(id);
      setSuccessMsg("School deleted successfully.");
      fetchSchools();
    } catch (err: any) {
      setError(err.message || "Failed to delete school");
    }
  };

  const handleToggleActive = async (id: number, currentStatus: boolean) => {
    if (!(await confirm(`Are you sure you want to ${currentStatus ? "deactivate" : "activate"} this school?`))) return;
    try {
      await updateSchool(id, { is_active: !currentStatus });
      setSuccessMsg("School status updated successfully.");
      fetchSchools();
    } catch (err: any) {
      setError(err.message || "Failed to update school status");
    }
  };

  const handleEditClick = (school: School) => {
    fetchFeatures();
    setEditingSchoolId(school.id || null);
    setFormData({
      name: school.name || "",
      email: school.email || "",
      phone: school.phone || "",
      address: school.address || "",
      city: school.city || "",
      state: school.state || "",
      country: school.country || "",
      pincode: school.pincode || "",
      feature_ids: school.feature_ids || [],
      is_active: school.is_active ?? true,
    });
    setSelectedFeatures(school.feature_ids || []);
    setIsAdding(true);
    setError("");
    setSuccessMsg("");
  };

  const handleChange =
    (field: FormFieldKey) => (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.type === "file") {
        setFormData((prev) => ({ ...prev, [field]: e.target.files?.[0] || null }));
      } else {
        setFormData((prev) => ({ ...prev, [field]: e.target.value }));
      }
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    setSuccessMsg("");
    try {
      const payload = {
        ...formData,
        feature_ids: selectedFeatures,
      };

      if (editingSchoolId) {
        await updateSchool(editingSchoolId, payload);
        setSuccessMsg("School updated successfully.");
      } else {
        const res = await createSchool(payload);
        setSuccessMsg(res.message || "School created successfully.");
      }

      setTimeout(() => {
        setSuccessMsg("");
      }, 3000);

      setFormData(EMPTY_FORM);
      setSelectedFeatures([]);
      setEditingSchoolId(null);
      setIsAdding(false);

      await fetchSchools();
    } catch (err: any) {
      setError(err.message || "Failed to save school.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleFeature = (featureId: number) => {
    setSelectedFeatures((prev) =>
      prev.includes(featureId)
        ? prev.filter((id) => id !== featureId)
        : [...prev, featureId],
    );
  };

  const handleFeatureStatusToggle = async (
    schoolFeatureId: number,
    currentStatus: boolean,
  ) => {
    try {
      const updatedStatus = !currentStatus;
      const confirmAction = await confirm(
        `Are you sure you want to ${updatedStatus ? "activate" : "disable"} this feature?`,
      );
      if (!confirmAction) return;

      await updateFeatureStatus(schoolFeatureId, updatedStatus);

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("feature_status_changed"));
      }

      if (!selectedSchool) return;

      setSelectedSchool({
        ...selectedSchool,
        school_features:
          selectedSchool.school_features?.map((sf) =>
            sf.id === schoolFeatureId
              ? {
                  ...sf,
                  is_enabled: updatedStatus,
                }
              : sf,
          ) || [],
      });

      const refreshedSchools = await getSchools();
      const formattedSchools = refreshedSchools.map((school: School) => ({
        ...school,
        feature_ids: school.school_features?.map((item) => item.feature) || [],
      }));

      setSchools(formattedSchools);
      const updatedSchool = formattedSchools.find((s) => s.id === selectedSchool.id);
      if (updatedSchool) setSelectedSchool(updatedSchool);
    } catch (err: any) {
      setError(err.message || "Failed to update feature");
    } finally {
      setLoadingFeatureId(null);
    }
  };

  const fields: {
    key: FormFieldKey;
    label: string;
    placeholder: string;
    type?: string;
    icon: React.ElementType;
    span?: boolean;
    accept?: string;
  }[] = [
    {
      key: "name",
      label: "School / Institution Name",
      placeholder: "e.g. Cambridge International School",
      icon: Building2,
      span: true,
    },
    {
      key: "index_no",
      label: "Index / Affiliation Number",
      placeholder: "e.g. CBSE-IND-1049",
      icon: Hash,
    },
    {
      key: "logo",
      label: "School Logo",
      placeholder: "",
      icon: Image as React.ElementType,
      type: "file",
      accept: "image/*",
    },
    {
      key: "email",
      label: "Official Email (Admin Login)",
      placeholder: "admin@school.edu",
      type: "email",
      icon: Mail,
    },
    {
      key: "phone",
      label: "Phone / Contact Number",
      placeholder: "+91 9876543210",
      icon: Phone,
    },
    {
      key: "address",
      label: "Campus Address",
      placeholder: "Plot 12, Knowledge Park III",
      icon: MapPin,
      span: true,
    },
    { key: "city", label: "City", placeholder: "Ahmedabad", icon: MapPin },
    { key: "state", label: "State", placeholder: "Gujarat", icon: MapPin },
    { key: "country", label: "Country", placeholder: "India", icon: Globe },
    { key: "pincode", label: "Pincode", placeholder: "380015", icon: Hash },
  ];

  const filteredSchools = schools.filter((s) => {
    const q = searchQuery.toLowerCase();
    return (
      (s.name || "").toLowerCase().includes(q) ||
      (s.code || "").toLowerCase().includes(q) ||
      (s.email || "").toLowerCase().includes(q) ||
      (s.city || "").toLowerCase().includes(q) ||
      (s.state || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-2 sm:p-4 text-slate-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                School Directory & Management
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Click on any school to view live telemetry (total students, boys, girls, staff), or onboard new campuses.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="icon"
            onClick={fetchSchools}
            disabled={isFetching}
            className="rounded-2xl border-slate-200"
            title="Refresh schools"
          >
            <RefreshCw className={`h-4 w-4 text-slate-600 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
          <Button
            onClick={() => {
              if (isAdding) {
                setIsAdding(false);
                setEditingSchoolId(null);
                setFormData(EMPTY_FORM);
                setSelectedFeatures([]);
              } else {
                fetchFeatures();
                setIsAdding(true);
              }
              setError("");
              setSuccessMsg("");
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-md shadow-indigo-200 px-5 gap-2 flex-1 sm:flex-none font-semibold text-xs"
          >
            {isAdding ? (
              <>
                <X className="h-4 w-4" />
                Close Form
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                + Add School
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Toast Alerts */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold shadow-sm"
          >
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            {successMsg}
          </motion.div>
        )}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-3 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-semibold shadow-sm"
          >
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add / Edit School Modal Form */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="bg-white rounded-3xl shadow-2xl p-6 md:p-8 w-full max-w-3xl overflow-hidden flex flex-col relative max-h-[90vh] border border-slate-100"
            >
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setEditingSchoolId(null);
                  setFormData(EMPTY_FORM);
                  setSelectedFeatures([]);
                  setError("");
                  setSuccessMsg("");
                }}
                className="absolute top-6 right-6 p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors z-10"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="mb-6">
                <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
                  {editingSchoolId ? "Edit School Institution" : "Onboard New School"}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Fill in institutional details and select subscribed modules.
                </p>
              </div>

              <div className="overflow-y-auto custom-scrollbar pr-2 flex-1">
                <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4">
                  {fields.map(({ key, label, placeholder, type, icon: Icon, span, accept }) => (
                    <div key={key} className={`space-y-1.5 ${span ? "sm:col-span-2" : ""}`}>
                      <Label htmlFor={key} className="text-xs font-semibold text-slate-700">
                        {label} {key !== "logo" && key !== "index_no" && <span className="text-rose-500">*</span>}
                      </Label>
                      <div className="relative">
                        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          id={key}
                          type={type || "text"}
                          required={key !== "logo" && key !== "index_no"}
                          placeholder={placeholder}
                          value={type === "file" ? undefined : ((formData[key as keyof typeof formData] as string) ?? "")}
                          accept={accept}
                          onChange={handleChange(key)}
                          className={`pl-9 h-10 text-xs rounded-xl border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 text-slate-900 ${
                            type === "file" ? "pt-2" : ""
                          }`}
                        />
                      </div>
                    </div>
                  ))}

                  <div className="sm:col-span-2 space-y-3 pt-2">
                    <Label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Module Subscriptions & Features
                    </Label>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                      {features.map((feature) => {
                        const isSelected = selectedFeatures.includes(feature.id);
                        const isDisabled = feature.is_enabled === false;

                        return (
                          <button
                            type="button"
                            key={feature.id}
                            disabled={isDisabled}
                            onClick={() => {
                              if (!isDisabled) toggleFeature(feature.id);
                            }}
                            className={`p-3 rounded-xl border text-left text-xs font-semibold transition-all flex items-center justify-between ${
                              isSelected
                                ? "bg-indigo-50/80 border-indigo-300 text-indigo-900 shadow-sm"
                                : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                            } ${isDisabled ? "opacity-40 cursor-not-allowed" : ""}`}
                          >
                            <span className="truncate">{feature.name}</span>
                            <div
                              className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                                isSelected ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-300 bg-white"
                              }`}
                            >
                              {isSelected && <span className="text-[10px]">✓</span>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="sm:col-span-2 flex justify-end gap-3 pt-4 border-t border-slate-100 mt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsAdding(false)}
                      className="rounded-xl border-slate-200 text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs px-6 font-semibold"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Saving...
                        </>
                      ) : editingSchoolId ? (
                        "Update School"
                      ) : (
                        "Save & Onboard"
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* School Directory Table with Search & Clickable Rows */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="font-bold text-base text-slate-900">Institutions Directory ({filteredSchools.length})</h3>
            <p className="text-xs text-slate-500">Click on any school row to open full live telemetry, students, and staff breakdown.</p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              placeholder="Search school by name, city, code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 text-xs rounded-2xl border-slate-200 text-slate-900 bg-slate-50/50"
            />
          </div>
        </div>

        {isFetching ? (
          <div className="p-12 flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            <p className="text-sm font-medium">Loading school institutions...</p>
          </div>
        ) : filteredSchools.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <SchoolIcon className="w-12 h-12 mx-auto mb-3 opacity-30 text-indigo-400" />
            <p className="text-base font-semibold text-slate-700">No schools found</p>
            <p className="text-xs text-slate-400 mt-1">Try a different search query or add a new school institution.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500 tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-4 px-5">School Code</th>
                  <th className="py-4 px-5">School Name</th>
                  <th className="py-4 px-5">Admin Email</th>
                  <th className="py-4 px-5">Phone</th>
                  <th className="py-4 px-5">Location</th>
                  <th className="py-4 px-5">Status</th>
                  <th className="py-4 px-5 text-center">Modules</th>
                  <th className="py-4 px-5 text-center">Quick Telemetry</th>
                  <th className="py-4 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredSchools.map((school) => {
                  const isActive = school.is_active ?? true;
                  return (
                    <tr
                      key={school.id}
                      onClick={() => handleOpenSchoolStats(school.id!)}
                      className="hover:bg-indigo-50/40 cursor-pointer transition-colors group"
                    >
                      <td className="py-4 px-5 font-mono font-bold text-indigo-600 group-hover:underline">
                        {school.code || "—"}
                      </td>
                      <td className="py-4 px-5">
                        <div className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">
                          {school.name}
                        </div>
                        {school.index_no && (
                          <span className="text-[10px] text-slate-400 font-mono">Index: {school.index_no}</span>
                        )}
                      </td>
                      <td className="py-4 px-5 text-slate-700">{school.email || "—"}</td>
                      <td className="py-4 px-5 text-slate-700">{school.phone || "—"}</td>
                      <td className="py-4 px-5 text-slate-700">
                        {school.city ? `${school.city}, ${school.state || ""}` : "—"}
                      </td>
                      <td className="py-4 px-5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            isActive ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-rose-500"}`} />
                          {isActive ? "Active" : "Suspended"}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-center" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedSchool(school);
                            setIsFeatureModalOpen(true);
                          }}
                          className="text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 font-semibold gap-1.5 rounded-xl px-2.5"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                          Manage ({school.school_features?.filter((f) => f.is_enabled)?.length || 0})
                        </Button>
                      </td>
                      <td className="py-4 px-5 text-center">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 bg-indigo-50 group-hover:bg-indigo-600 group-hover:text-white px-3 py-1.5 rounded-xl transition-colors">
                          <BarChart3 className="w-3.5 h-3.5" />
                          View Stats
                        </span>
                      </td>
                      <td className="py-4 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleActive(school.id!, isActive)}
                            title={isActive ? "Deactivate School" : "Activate School"}
                            className={`h-8 w-8 rounded-xl ${
                              isActive ? "text-slate-400 hover:text-rose-600 hover:bg-rose-50" : "text-emerald-600 hover:bg-emerald-50"
                            }`}
                          >
                            <Power className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditClick(school)}
                            title="Edit School Details"
                            className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(school.id!)}
                            title="Delete School"
                            className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 🌟 Comprehensive School Specific Telemetry & Demographics Modal */}
      <AnimatePresence>
        {isDetailModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="bg-white rounded-3xl shadow-2xl p-6 md:p-8 w-full max-w-4xl overflow-hidden flex flex-col relative max-h-[90vh] border border-slate-100"
            >
              <button
                type="button"
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setSchoolStats(null);
                }}
                className="absolute top-6 right-6 p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors z-10"
              >
                <X className="h-5 w-5" />
              </button>

              {loadingDetail ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
                  <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
                  <p className="text-sm font-semibold text-slate-600">Loading school telemetry & demographics...</p>
                </div>
              ) : schoolStats ? (
                <div className="overflow-y-auto custom-scrollbar pr-2 space-y-6">
                  {/* School Top Banner */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-4">
                      <div className="p-3.5 bg-gradient-to-tr from-indigo-600 to-indigo-800 text-white rounded-2xl shadow-md">
                        <Building2 className="w-7 h-7" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl font-bold text-slate-900">{schoolStats.school.name}</h3>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              schoolStats.school.is_active
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-rose-50 text-rose-700 border border-rose-200"
                            }`}
                          >
                            {schoolStats.school.is_active ? "Active" : "Suspended"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-indigo-600">Code: {schoolStats.school.code}</span>
                          {schoolStats.school.index_no && <span>• Index: {schoolStats.school.index_no}</span>}
                          <span>• {schoolStats.school.city}, {schoolStats.school.state}</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 4 Core Metrics for this School */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {/* Total Students */}
                    <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100">
                      <p className="text-[11px] font-bold uppercase text-indigo-700 tracking-wider">Total Students</p>
                      <h4 className="text-2xl font-black text-slate-900 mt-1">{schoolStats.metrics.total_students}</h4>
                      <p className="text-[11px] text-slate-500 font-medium mt-1">
                        {schoolStats.metrics.rte_students} RTE quota
                      </p>
                    </div>

                    {/* Total Boys */}
                    <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-100">
                      <p className="text-[11px] font-bold uppercase text-blue-700 tracking-wider">👦 Total Boys</p>
                      <h4 className="text-2xl font-black text-slate-900 mt-1">{schoolStats.metrics.total_boys}</h4>
                      <p className="text-[11px] text-blue-700 font-semibold mt-1">
                        {schoolStats.metrics.total_students > 0
                          ? Math.round((schoolStats.metrics.total_boys / schoolStats.metrics.total_students) * 100)
                          : 0}% of school
                      </p>
                    </div>

                    {/* Total Girls */}
                    <div className="p-4 rounded-2xl bg-pink-50/70 border border-pink-100">
                      <p className="text-[11px] font-bold uppercase text-pink-700 tracking-wider">👧 Total Girls</p>
                      <h4 className="text-2xl font-black text-slate-900 mt-1">{schoolStats.metrics.total_girls}</h4>
                      <p className="text-[11px] text-pink-700 font-semibold mt-1">
                        {schoolStats.metrics.total_students > 0
                          ? Math.round((schoolStats.metrics.total_girls / schoolStats.metrics.total_students) * 100)
                          : 0}% of school
                      </p>
                    </div>

                    {/* Total Staff */}
                    <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100">
                      <p className="text-[11px] font-bold uppercase text-emerald-700 tracking-wider">👨‍🏫 Total Staff</p>
                      <h4 className="text-2xl font-black text-slate-900 mt-1">{schoolStats.metrics.total_staff}</h4>
                      <p className="text-[11px] text-emerald-700 font-semibold mt-1">
                        {schoolStats.metrics.teachers_count} Teachers ({schoolStats.metrics.non_teaching_count} Support)
                      </p>
                    </div>
                  </div>

                  {/* Demographic & Staff Ratio Meters */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Gender Balance */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-slate-700 flex items-center gap-1.5">
                          <PieChartIcon className="w-4 h-4 text-indigo-600" />
                          Gender Demographics
                        </span>
                        <span className="text-slate-500">
                          {schoolStats.metrics.total_students} Enrolled
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <div className="flex justify-between text-[11px] font-bold text-slate-700 mb-1">
                            <span className="text-blue-600">Boys ({schoolStats.metrics.total_boys})</span>
                            <span>
                              {schoolStats.metrics.total_students > 0
                                ? Math.round((schoolStats.metrics.total_boys / schoolStats.metrics.total_students) * 100)
                                : 0}%
                            </span>
                          </div>
                          <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full"
                              style={{
                                width: `${
                                  schoolStats.metrics.total_students > 0
                                    ? (schoolStats.metrics.total_boys / schoolStats.metrics.total_students) * 100
                                    : 0
                                }%`,
                              }}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-[11px] font-bold text-slate-700 mb-1">
                            <span className="text-pink-600">Girls ({schoolStats.metrics.total_girls})</span>
                            <span>
                              {schoolStats.metrics.total_students > 0
                                ? Math.round((schoolStats.metrics.total_girls / schoolStats.metrics.total_students) * 100)
                                : 0}%
                            </span>
                          </div>
                          <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-pink-500 rounded-full"
                              style={{
                                width: `${
                                  schoolStats.metrics.total_students > 0
                                    ? (schoolStats.metrics.total_girls / schoolStats.metrics.total_students) * 100
                                    : 0
                                }%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Teacher to Student Ratio */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between space-y-3">
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-slate-700 flex items-center gap-1.5">
                          <Briefcase className="w-4 h-4 text-emerald-600" />
                          Faculty Telemetry
                        </span>
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          {schoolStats.metrics.active_staff} Active Staff
                        </span>
                      </div>
                      <div className="p-3 bg-white rounded-xl border border-slate-100 flex items-center justify-between">
                        <span className="text-xs text-slate-600">Teacher : Student Ratio:</span>
                        <span className="text-sm font-bold text-emerald-700">
                          1 : {schoolStats.metrics.teachers_count > 0
                            ? Math.round(schoolStats.metrics.total_students / schoolStats.metrics.teachers_count)
                            : 0}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Mail className="w-3.5 h-3.5" />
                        <span>{schoolStats.school.email}</span>
                        <span className="mx-1">•</span>
                        <Phone className="w-3.5 h-3.5" />
                        <span>{schoolStats.school.phone}</span>
                      </div>
                    </div>
                  </div>

                  {/* Classes & Student Distribution */}
                  {schoolStats.classes && schoolStats.classes.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <GraduationCap className="w-4 h-4 text-indigo-600" />
                        Class-wise Student Distribution ({schoolStats.classes.length} Classes)
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                        {schoolStats.classes.map((cls) => (
                          <div key={cls.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                            <p className="font-bold text-xs text-slate-900">{cls.name}</p>
                            <p className="text-sm font-black text-indigo-600 mt-1">{cls.total_students} Students</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              👦 {cls.boys} Boys • 👧 {cls.girls} Girls
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Key Staff Members */}
                  {schoolStats.staff && schoolStats.staff.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-indigo-600" />
                        Campus Staff Roster
                      </h4>
                      <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100 overflow-hidden bg-white">
                        {schoolStats.staff.map((st) => (
                          <div key={st.id} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50">
                            <div>
                              <p className="font-bold text-slate-900">{st.name}</p>
                              <p className="text-[11px] text-slate-400">{st.email} • {st.mobile}</p>
                            </div>
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
                              {st.category}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Subscribed Features */}
                  {schoolStats.features && schoolStats.features.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-indigo-600" />
                        Subscribed SaaS Modules
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {schoolStats.features.map((feat) => (
                          <span
                            key={feat.id}
                            className={`px-3 py-1 rounded-xl text-xs font-semibold ${
                              feat.is_enabled
                                ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                                : "bg-slate-100 text-slate-400"
                            }`}
                          >
                            {feat.name} {feat.is_enabled ? "✓" : "(Disabled)"}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400">
                  <p>Failed to load school telemetry details.</p>
                </div>
              )}

              <div className="flex justify-end pt-4 border-t border-slate-100 mt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="rounded-2xl text-xs"
                >
                  Close
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Feature Management Modal */}
      <AnimatePresence>
        {isFeatureModalOpen && selectedSchool && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="bg-white rounded-3xl shadow-2xl p-6 md:p-8 w-full max-w-2xl border border-slate-100"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    Feature Subscriptions: {selectedSchool.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Toggle active SaaS modules for this specific school instance.
                  </p>
                </div>
                <button
                  onClick={() => setIsFeatureModalOpen(false)}
                  className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="py-6 max-h-[60vh] overflow-y-auto space-y-3">
                {selectedSchool.school_features && selectedSchool.school_features.length > 0 ? (
                  selectedSchool.school_features.map((sf) => (
                    <div
                      key={sf.id}
                      className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200/60"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            sf.is_enabled ? "bg-emerald-500" : "bg-slate-300"
                          }`}
                        />
                        <span className="text-xs font-bold text-slate-800">
                          {features.find((f) => f.id === sf.feature)?.name || sf.feature_name || `Feature #${sf.feature}`}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant={sf.is_enabled ? "default" : "outline"}
                        disabled={loadingFeatureId === sf.id}
                        onClick={() => handleFeatureStatusToggle(sf.id, sf.is_enabled)}
                        className={`text-xs rounded-xl h-8 px-4 font-semibold ${
                          sf.is_enabled
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                            : "border-slate-300 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {loadingFeatureId === sf.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : sf.is_enabled ? (
                          "Enabled"
                        ) : (
                          "Disabled"
                        )}
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 text-center py-6">No specific features configured.</p>
                )}
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100">
                <Button
                  variant="outline"
                  onClick={() => setIsFeatureModalOpen(false)}
                  className="rounded-xl text-xs"
                >
                  Close
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
