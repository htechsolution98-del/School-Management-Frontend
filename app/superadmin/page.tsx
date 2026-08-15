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
} from "lucide-react";

import {
  getSchools,
  createSchool,
  updateSchool,
  deleteSchool,
  updateFeatureStatus,
  createSchoolFeature,
  fetchFeaturesList,
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

export default function SuperAdminDashboard() {
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
  {
    /* New states for the Modal */
  }
  const [isFeatureModalOpen, setIsFeatureModalOpen] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [loadingFeatureId, setLoadingFeatureId] = useState<number | null>(null);
  // --------

  const handleDelete = async (id: number) => {
    if (!(await confirm("Are you sure you want to delete this school?"))) return;
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
        setSuccessMsg(
          res.message || "School created successfully.",
        );
      }

      setTimeout(() => {
        setSuccessMsg("");
      }, 2000);

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
        `Are you sure you want to ${
          updatedStatus ? "activate" : "disable"
        } this feature?`,
      );

      if (!confirmAction) return;

      await updateFeatureStatus(schoolFeatureId, updatedStatus);

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

      setSuccessMsg(
        `Feature ${updatedStatus ? "enabled" : "disabled"} successfully`,
      );
    } catch (err: any) {
      setError(err.message || "Failed to update feature status");
    }
  };

  const openFeatureModal = (school: School) => {
    setSelectedSchool(school);
    setSelectedFeatures(school.feature_ids || []);
    setIsFeatureModalOpen(true);
  };

  const handleIndividualFeatureUpdate = async (
    featureId: number,
    shouldSelect: boolean,
  ) => {
    if (!selectedSchool) return;

    try {
      setLoadingFeatureId(featureId);

      let updatedFeatures: number[] = [];

      if (shouldSelect) {
        updatedFeatures = [...selectedFeatures, featureId];
      } else {
        updatedFeatures = selectedFeatures.filter((id) => id !== featureId);
      }

      // FIND SCHOOL FEATURE
      const schoolFeature = selectedSchool.school_features?.find(
        (sf) => sf.feature === featureId,
      );

      // FEATURE EXISTS -> UPDATE
      if (schoolFeature) {
        await updateFeatureStatus(schoolFeature.id, shouldSelect);
      } else {
        // CREATE NEW SCHOOL FEATURE

        if (selectedSchool.id !== undefined) {
          await createSchoolFeature(selectedSchool.id, featureId);
        }
      }

      // REFRESH DATA
      const refreshedSchools = await getSchools();

      const formattedSchools = refreshedSchools.map((school: School) => ({
        ...school,
        feature_ids: school.school_features?.map((item) => item.feature) || [],
      }));

      setSchools(formattedSchools);

      const updatedSchool = formattedSchools.find(
        (s) => s.id === selectedSchool.id,
      );

      if (updatedSchool) {
        setSelectedSchool(updatedSchool);
      }
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
      label: "School / Organization Name",
      placeholder: "e.g. Sunrise Academy",
      icon: Building2,
      span: true,
    },
    {
      key: "index_no",
      label: "Index Number",
      placeholder: "e.g. IND-123",
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
      label: "Email",
      placeholder: "contact@example.com",
      type: "email",
      icon: Mail,
    },
    {
      key: "phone",
      label: "Phone",
      placeholder: "+91 9000000000",
      icon: Phone,
    },
    {
      key: "address",
      label: "Address",
      placeholder: "123 Main Street",
      icon: MapPin,
      span: true,
    },
    { key: "city", label: "City", placeholder: "Mumbai", icon: MapPin },
    { key: "state", label: "State", placeholder: "Maharashtra", icon: MapPin },
    { key: "country", label: "Country", placeholder: "India", icon: Globe },
    { key: "pincode", label: "Pincode", placeholder: "400001", icon: Hash },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
            Manage Schools
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Create and view all school / trustee registrations.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={fetchSchools}
            disabled={isFetching}
            title="Refresh"
          >
            <RefreshCw
              className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
            />
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
            className="bg-[#4F46E5] hover:bg-[#4338CA] text-white"
          >
            {isAdding ? (
              <>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Add School
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Toast Messages */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm font-medium"
          >
            <span className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
            {successMsg}
          </motion.div>
        )}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-medium"
          >
            <span className="h-2 w-2 rounded-full bg-red-500 shrink-0" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create / Edit Form Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-white rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] p-6 md:p-8 w-full max-w-3xl overflow-hidden flex flex-col relative max-h-[90vh]"
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
              
              <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-6">
                {editingSchoolId ? "Edit School" : "Register New School"}
              </h3>
              
              <div className="overflow-y-auto custom-scrollbar pr-2 flex-1">
                <form
                  onSubmit={handleSubmit}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-5 pb-4"
                >
                {fields.map(
                  ({ key, label, placeholder, type, icon: Icon, span, accept }) => (
                    <div
                      key={key}
                      className={`space-y-1.5 ${span ? "sm:col-span-2" : ""}`}
                    >
                      <Label
                        htmlFor={key}
                        className="text-sm font-medium text-gray-700"
                      >
                        {label}
                      </Label>
                      <div className="relative">
                        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id={key}
                          type={type || "text"}
                          required={key !== "logo" && key !== "index_no"}
                          placeholder={placeholder}
                          value={type === "file" ? undefined : formData[key as keyof typeof formData] as string}
                          accept={accept}
                          onChange={handleChange(key)}
                          className={`pl-9 h-11 rounded-xl border-gray-200 focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20 ${type === 'file' ? 'pt-2' : ''}`}
                        />
                      </div>
                    </div>
                  ),
                )}

              <div className="sm:col-span-2 space-y-3">
                <Label className="text-sm font-medium text-gray-700">
                  Select Features
                </Label>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {features.map((feature) => {
                    const isSelected = selectedFeatures.includes(feature.id);

                    const isDisabled = feature.is_enabled === false;

                    return (
                      <button
                        type="button"
                        key={feature.id}
                        disabled={isDisabled}
                        onClick={() => {
                          if (!isDisabled) {
                            toggleFeature(feature.id);
                          }
                        }}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all border ${
                          isDisabled
                            ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-60"
                            : isSelected
                              ? "bg-[#4F46E5] text-white border-[#4F46E5]"
                              : "bg-gray-50 text-gray-600 border-gray-200 hover:border-[#4F46E5]"
                        }`}
                      >
                        {feature.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="sm:col-span-2 flex justify-end pt-4 mt-2 border-t border-gray-100">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#4F46E5] hover:bg-[#4338CA] text-white px-8 h-11 rounded-xl"
                >
                  {isSubmitting && (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  )}
                  {isSubmitting ? "Saving…" : editingSchoolId ? "Update School" : "Create School"}
                </Button>
              </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Schools Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Code</th>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Phone</th>
                <th className="px-6 py-4">City</th>
                <th className="px-6 py-4">State</th>
                <th className="px-6 py-4">Country</th>
                <th className="px-6 py-4">Pincode</th>
                <th className="px-6 py-4">Features</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isFetching ? (
                <tr>
                  <td colSpan={11} className="px-6 py-12 text-center">
                    <Loader2 className="h-6 w-6 animate-spin text-[#4F46E5] mx-auto" />
                    <p className="text-gray-400 text-sm mt-2">
                      Loading schools…
                    </p>
                  </td>
                </tr>
              ) : schools.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-6 py-12 text-center">
                    <Users className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-400 text-sm">
                      No schools found. Create one to get started.
                    </p>
                  </td>
                </tr>
              ) : (
                schools.map((school, idx) => (
                  <motion.tr
                    key={school.id ?? idx}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.04 }}
                    className="hover:bg-gray-50/60 transition-colors"
                  >
                    <td className="px-6 py-4 text-gray-600">
                      {school.code || "-"}
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {school.name || "-"}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {school.email || "-"}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {school.phone || "-"}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {school.city || "-"}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {school.state || "-"}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {school.country || "-"}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {school.pincode || "-"}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      <button
                        onClick={() => openFeatureModal(school)}
                        className="inline-flex items-center gap-1 whitespace-nowrap text-[#4F46E5] hover:underline font-medium"
                      >
                        {school?.school_features?.filter(
                          (feature) => feature.is_enabled === true,
                        ).length || 0}{" "}
                        Features
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                          (school.is_active ?? true)
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {(school.is_active ?? true) ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggleActive(school.id!, school.is_active ?? true)}
                          className={`inline-flex items-center justify-center rounded-full p-2 hover:bg-gray-100 transition-colors ${
                            (school.is_active ?? true) ? "text-red-500" : "text-emerald-500"
                          }`}
                          title={(school.is_active ?? true) ? "Deactivate School" : "Activate School"}
                        >
                          <Power className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEditClick(school)}
                          className="inline-flex items-center justify-center text-blue-600 hover:bg-blue-50 rounded-full p-2 transition-colors"
                          title="Edit School"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(school.id!)}
                          className="inline-flex items-center justify-center text-red-600 hover:bg-red-50 rounded-full p-2 transition-colors"
                          title="Delete School"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Feature Modal */}
      <AnimatePresence>
        {isFeatureModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] w-full max-w-lg overflow-hidden flex flex-col border border-white"
            >
              {/* --- HEADER --- */}
              <div className="pt-8 px-8 pb-6 flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight">
                    Configure Access
                  </h3>
                  <p className="text-[15px] text-slate-500 mt-1">
                    Managing features for{" "}
                    <span className="font-bold text-indigo-600">
                      {selectedSchool?.name}
                    </span>
                  </p>
                </div>
                <button
                  onClick={() => setIsFeatureModalOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* --- COLUMN LABELS --- */}
              <div className="px-10 py-3 flex justify-between items-center bg-slate-50/50">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em]">
                  Toggle School Access
                </span>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em]">
                  Global Status
                </span>
              </div>

              {/* --- CONTENT AREA --- */}
              <div className="flex-1 max-h-[500px] overflow-y-auto px-6 py-4 space-y-3 custom-scrollbar">
                {features.map((feature) => {
                  const schoolFeature = selectedSchool?.school_features?.find(
                    (sf) => sf.feature === feature.id,
                  );

                  const isSelected = schoolFeature?.is_enabled ?? false;
                  const isGlobalEnabled = schoolFeature?.is_enabled ?? false;
                  const isThisLoading = loadingFeatureId === feature.id;

                  console.log("selected : ", isSelected);

                  return (
                    <motion.div
                      key={feature.id}
                      whileHover={{ y: -2 }}
                      className={`flex items-center justify-between p-4 rounded-[20px] transition-all border-2 ${
                        isSelected
                          ? "bg-white border-indigo-100 shadow-[0_8px_20px_-6px_rgba(79,70,229,0.1)]"
                          : "bg-white border-slate-50 shadow-sm hover:border-slate-200"
                      }`}
                    >
                      {/* Left Side: Toggle Switch & Name */}
                      <div
                        className={`flex items-center gap-5 flex-1 ${isThisLoading ? "opacity-50" : "cursor-pointer"}`}
                        onClick={async () => {
                          if (isThisLoading) return;

                          const confirmAction = await confirm(
                            `Are you sure you want to ${
                              !isSelected ? "enable" : "disable"
                            } ${feature.name}?`,
                          );

                          if (!confirmAction) return;

                          handleIndividualFeatureUpdate(
                            feature.id,
                            !isSelected,
                          );
                        }}
                      >
                        {/* Premium Switch */}
                        <div
                          className={`relative w-12 h-6 rounded-full transition-all duration-300 ${
                            isSelected ? "bg-indigo-600" : "bg-slate-200"
                          }`}
                        >
                          <motion.div
                            animate={{ x: isSelected ? 24 : 4 }}
                            transition={{
                              type: "spring",
                              stiffness: 500,
                              damping: 30,
                            }}
                            className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm flex items-center justify-center"
                          >
                            {isThisLoading && (
                              <Loader2 className="h-2 w-2 text-indigo-600 animate-spin" />
                            )}
                          </motion.div>
                        </div>

                        <span
                          className={`text-[15px] font-bold tracking-tight ${isSelected ? "text-indigo-900" : "text-slate-600"}`}
                        >
                          {feature.name}
                        </span>
                      </div>

                      {/* Right Side: Global Status Badge */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();

                          if (schoolFeature) {
                            handleFeatureStatusToggle(
                              schoolFeature.id,
                              schoolFeature.is_enabled,
                            );
                          }
                        }}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black transition-all border ${
                          isGlobalEnabled
                            ? "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100"
                            : "bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100"
                        }`}
                      >
                        <div
                          className={`h-1.5 w-1.5 rounded-full ${isGlobalEnabled ? "bg-emerald-500" : "bg-rose-500"}`}
                        />
                        {/* THIS IS THE CHANGE: Swapping INACTIVE for DISABLED */}
                        {isGlobalEnabled ? "ACTIVE" : "DISABLED"}
                      </button>
                    </motion.div>
                  );
                })}
              </div>

              {/* --- FOOTER --- */}
              <div className="p-8 bg-slate-50/80 border-t border-slate-100 flex justify-center">
                <p className="text-xs text-slate-400 font-semibold tracking-tight">
                  Changes update the school profile in real-time.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}
