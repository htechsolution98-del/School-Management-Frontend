"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BadgeIndianRupee,
  Calendar,
  Loader2,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  UserPlus,
  Users,
  X,
  Edit2,
  Trash2,
  Power,
  DollarSign,
  TrendingUp,
  Landmark,
  FileCheck2,
  FileText,
  Clock,
  Plus,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Building,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createStaff, getStaffCategories, getStaffList, updateStaff, deleteStaff } from "@/lib/staff";
import { toHTMLDate, toApiDate } from "@/lib/dateUtils";
import { CreateStaffPayload, Staff, StaffCategory } from "@/types";
import {
  TrusteeAnalyticsResponse,
  BoardMeeting,
  getTrusteeAnalytics,
  getBoardMeetings,
  createBoardMeeting,
  updateBoardMeeting,
  deleteBoardMeeting,
} from "@/lib/trustee";

const STAFF_CATEGORIES: { label: string; value: StaffCategory }[] = [
  { label: "Teacher", value: "TEACHER" },
  { label: "Clerk", value: "CLERK" },
  { label: "Librarian", value: "LIBRARIAN" },
  { label: "Fee Management", value: "FEE MANAGEMENT" },
  { label: "Principal", value: "PRINCIPAL" },
  { label: "Transportation", value: "TRANSOPORTATION" },
  { label: "INVENTORY", value: "INVENTORY" },
];

const EMPTY_FORM: CreateStaffPayload = {
  name: "",
  email: "",
  mobile: "",
  category: "" as StaffCategory,
  address: "",
  date_of_birth: "",
  salary: "",
  is_active: true,
};

export default function TrusteeDashboard() {
  const [activeTab, setActiveTab] = useState<"overview" | "staff" | "rte" | "meetings">("overview");

  // Staff States
  const [staff, setStaff] = useState<Staff[]>([]);
  const [formData, setFormData] = useState<CreateStaffPayload>(EMPTY_FORM);
  const [isAdding, setIsAdding] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [staffCategories, setStaffCategories] = useState<any[]>([]);

  // Edit Staff State
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<CreateStaffPayload>(EMPTY_FORM);
  const [isUpdating, setIsUpdating] = useState(false);

  // Analytics & Meetings
  const [analytics, setAnalytics] = useState<TrusteeAnalyticsResponse | null>(null);
  const [meetings, setMeetings] = useState<BoardMeeting[]>([]);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [meetingForm, setMeetingForm] = useState({
    title: "",
    agenda: "",
    meeting_date: new Date().toISOString().split("T")[0],
    meeting_time: "10:00 AM",
    location: "Board Room, Admin Block",
    attendees: "Trustees, Principal, Finance Officer",
    minutes: "",
    status: "SCHEDULED",
  });

  const fetchStaffData = useCallback(async () => {
    setIsFetching(true);
    setError("");
    try {
      const [staffData, catsData, analyticsData, meetingsData] = await Promise.all([
        getStaffList().catch(() => []),
        getStaffCategories().catch(() => []),
        getTrusteeAnalytics().catch(() => null),
        getBoardMeetings().catch(() => []),
      ]);

      setStaff(staffData);
      setStaffCategories(catsData);
      setAnalytics(analyticsData);
      setMeetings(meetingsData);
    } catch {
      setError("Failed to load records.");
    } finally {
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    fetchStaffData();

    const handleRealtimeUpdate = () => {
      fetchStaffData();
    };

    window.addEventListener("feature_status_changed", handleRealtimeUpdate);
    window.addEventListener("staff_status_changed", handleRealtimeUpdate);
    window.addEventListener("focus", handleRealtimeUpdate);

    return () => {
      window.removeEventListener("feature_status_changed", handleRealtimeUpdate);
      window.removeEventListener("staff_status_changed", handleRealtimeUpdate);
      window.removeEventListener("focus", handleRealtimeUpdate);
    };
  }, [fetchStaffData]);

  const activeCount = useMemo(() => staff.filter((m) => m.is_active).length, [staff]);

  const handleEditClick = (staffMember: Staff) => {
    setEditingStaff(staffMember);
    const matchCat = staffCategories.find(
      (c) => c.feature_name.toUpperCase() === String(staffMember.category).toUpperCase()
    );
    const categoryId = matchCat ? matchCat.feature_id : staffMember.category;

    setEditFormData({
      name: staffMember.name || "",
      email: staffMember.email || "",
      mobile: staffMember.mobile || "",
      category: categoryId as any,
      address: staffMember.address || "",
      date_of_birth: staffMember.date_of_birth || "",
      salary: staffMember.salary || "",
      is_active: staffMember.is_active,
    });
    setIsEditing(true);
    setIsAdding(false);
  };

  const maxAllowedDob = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 18);
    return d.toISOString().split("T")[0];
  }, []);

  const toApiDate = (val?: string) => {
    if (!val) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
      const [y, m, d] = val.split("-");
      return `${d}-${m}-${y}`;
    }
    return val;
  };

  const toHTMLDate = (val?: string) => {
    if (!val) return "";
    if (/^\d{2}-\d{2}-\d{4}$/.test(val)) {
      const [d, m, y] = val.split("-");
      return `${y}-${m}-${d}`;
    }
    return val;
  };

  const validateStaffAge = (dobString: string): boolean => {
    if (!dobString) return false;
    let year: number, month: number, day: number;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dobString)) {
      const parts = dobString.split("-");
      year = Number(parts[0]);
      month = Number(parts[1]) - 1;
      day = Number(parts[2]);
    } else if (/^\d{2}-\d{2}-\d{4}$/.test(dobString)) {
      const parts = dobString.split("-");
      day = Number(parts[0]);
      month = Number(parts[1]) - 1;
      year = Number(parts[2]);
    } else {
      const dob = new Date(dobString);
      if (isNaN(dob.getTime())) return false;
      year = dob.getFullYear();
      month = dob.getMonth();
      day = dob.getDate();
    }
    const today = new Date();
    let age = today.getFullYear() - year;
    const m = today.getMonth() - month;
    if (m < 0 || (m === 0 && today.getDate() < day)) {
      age--;
    }
    return age >= 18;
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    if (editFormData.date_of_birth && !validateStaffAge(editFormData.date_of_birth)) {
      setError("Staff member must be at least 18 years old (Age >= 18).");
      return;
    }
    setIsUpdating(true);
    setError("");
    setSuccessMsg("");
    try {
      await updateStaff(editingStaff.id, {
        ...editFormData,
        date_of_birth: toApiDate(editFormData.date_of_birth),
      });
      setSuccessMsg("Staff member updated successfully.");
      setIsEditing(false);
      setEditingStaff(null);
      await fetchStaffData();
    } catch (err: any) {
      setError(err.message || "Failed to update staff.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this staff member?")) return;
    setError("");
    setSuccessMsg("");
    try {
      await deleteStaff(id);
      setSuccessMsg("Staff member deleted successfully.");
      await fetchStaffData();
    } catch (err: any) {
      setError(err.message || "Failed to delete staff.");
    }
  };

  const handleToggleActive = async (member: Staff) => {
    setError("");
    setSuccessMsg("");
    try {
      await updateStaff(member.id, { is_active: !member.is_active });
      setSuccessMsg(`Staff member ${member.is_active ? "deactivated" : "activated"} successfully.`);
      await fetchStaffData();
    } catch (err: any) {
      setError(err.message || "Failed to update staff status.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.date_of_birth && !validateStaffAge(formData.date_of_birth)) {
      setError("Staff member must be at least 18 years old (Age >= 18).");
      return;
    }
    setIsSubmitting(true);
    setError("");
    setSuccessMsg("");
    try {
      await createStaff({
        ...formData,
        date_of_birth: toApiDate(formData.date_of_birth),
      });
      setSuccessMsg("Staff member created successfully.");
      setFormData(EMPTY_FORM);
      setIsAdding(false);
      await fetchStaffData();
    } catch (err: any) {
      setError(err.message || "Failed to create staff.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await createBoardMeeting(meetingForm);
      setSuccessMsg("Board meeting scheduled successfully.");
      setShowMeetingModal(false);
      await fetchStaffData();
    } catch (err: any) {
      setError(err.message || "Failed to schedule meeting.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const categoryLabel = (category: StaffCategory) =>
    STAFF_CATEGORIES.find((item) => item.value === category)?.label ?? category;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 p-8 text-white shadow-xl">
        <div className="absolute right-0 top-0 -mt-10 -mr-10 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-emerald-200 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5" /> Board Governance & Oversight
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Trustee Governance Panel</h1>
            <p className="text-emerald-100 max-w-xl text-sm md:text-base">
              Financial auditing, RTE compliance monitoring, board meeting schedules, and institutional staff directory.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => {
                setShowMeetingModal(true);
              }}
              className="bg-white text-emerald-900 hover:bg-emerald-50 font-semibold shadow-lg"
            >
              <Plus className="mr-1.5 h-4 w-4" /> Schedule Board Meeting
            </Button>
            <Button
              variant="outline"
              onClick={fetchStaffData}
              disabled={isFetching}
              className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Total Fee Revenue",
            value: `₹${(analytics?.financials.total_fee_collected || 0).toLocaleString()}`,
            sub: `Billed: ₹${(analytics?.financials.total_fee_billed || 0).toLocaleString()}`,
            icon: DollarSign,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
            border: "border-emerald-100",
          },
          {
            label: "RTE Compliance",
            value: `${analytics?.rte_stats.rte_percentage || 0}%`,
            sub: `${analytics?.rte_stats.rte_students || 0} / ${analytics?.rte_stats.total_students || 0} Quota Students`,
            icon: ShieldCheck,
            color: (analytics?.rte_stats.rte_percentage || 0) >= 25 ? "text-teal-600" : "text-amber-600",
            bg: (analytics?.rte_stats.rte_percentage || 0) >= 25 ? "bg-teal-50" : "bg-amber-50",
            border: (analytics?.rte_stats.rte_percentage || 0) >= 25 ? "border-teal-100" : "border-amber-100",
          },
          {
            label: "Total Staff Force",
            value: staff.length,
            sub: `${activeCount} Currently Active`,
            icon: Users,
            color: "text-indigo-600",
            bg: "bg-indigo-50",
            border: "border-indigo-100",
          },
          {
            label: "Asset Valuation",
            value: `₹${(analytics?.financials.total_assets_valuation || 0).toLocaleString()}`,
            sub: `${analytics?.asset_stats.total_items || 0} Registered Items`,
            icon: Building,
            color: "text-cyan-600",
            bg: "bg-cyan-50",
            border: "border-cyan-100",
          },
        ].map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={`rounded-2xl border ${stat.border} bg-white p-5 shadow-sm hover:shadow-md transition-shadow`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                  <p className="text-xs text-gray-500 mt-1 font-medium">{stat.sub}</p>
                </div>
                <div className={`p-3.5 rounded-2xl ${stat.bg} ${stat.color} shadow-inner`}>
                  <Icon className="h-6 w-6" />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2 overflow-x-auto">
        {[
          { id: "overview", label: "Financial & Audit Overview", icon: Landmark },
          { id: "rte", label: "RTE Quota & Admission Stats", icon: ShieldCheck },
          { id: "meetings", label: "Board Meetings & Minutes", icon: Calendar, count: meetings.length },
          { id: "staff", label: "Staff Directory", icon: Users, count: staff.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${
                isActive
                  ? "bg-emerald-800 text-white shadow-md shadow-emerald-200"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
              {typeof tab.count === "number" && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    isActive ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: FINANCIAL OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-emerald-600" /> Revenue & Collections
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-100 text-sm">
                  <span className="text-gray-500">Gross Fees Billed</span>
                  <span className="font-bold text-gray-900">
                    ₹{(analytics?.financials.total_fee_billed || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100 text-sm">
                  <span className="text-emerald-600 font-medium">Net Realized Collection</span>
                  <span className="font-bold text-emerald-700">
                    ₹{(analytics?.financials.total_fee_collected || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between py-2 text-sm">
                  <span className="text-rose-600 font-medium">Outstanding Dues</span>
                  <span className="font-bold text-rose-700">
                    ₹{(analytics?.financials.pending_collections || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                <Building className="h-5 w-5 text-indigo-600" /> Operational Expenditures
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-100 text-sm">
                  <span className="text-gray-500">Staff Salary Outflow</span>
                  <span className="font-bold text-gray-900">
                    ₹{(analytics?.financials.total_payroll_expenditure || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100 text-sm">
                  <span className="text-gray-500">Infrastructure Asset Worth</span>
                  <span className="font-bold text-gray-900">
                    ₹{(analytics?.financials.total_assets_valuation || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between py-2 text-sm">
                  <span className="text-gray-500">Active Staff Headcount</span>
                  <span className="font-bold text-gray-900">{analytics?.staff_stats.active_staff || 0} Members</span>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-teal-600" /> Compliance Status
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-100 text-sm">
                  <span className="text-gray-500">RTE Statutory Target</span>
                  <span className="font-bold text-gray-900">25.0%</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100 text-sm">
                  <span className="text-gray-500">Current RTE Enrolled</span>
                  <span className="font-bold text-teal-700">{analytics?.rte_stats.rte_percentage || 0}%</span>
                </div>
                <div className="flex justify-between py-2 text-sm">
                  <span className="text-gray-500">Audit Status</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs">
                    Verified Clean
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: RTE COMPLIANCE */}
      {activeTab === "rte" && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
            <div className="max-w-xl space-y-3">
              <h3 className="text-xl font-bold text-gray-900">Right to Education (RTE) Mandate Audit</h3>
              <p className="text-sm text-gray-500">
                Under the RTE Act, schools are mandated to allocate 25% of entry-level seats to economically weaker sections.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-xs text-gray-400 font-bold uppercase">Total School Enrollment</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{analytics?.rte_stats.total_students || 0}</p>
              </div>
              <div className="bg-teal-50 p-4 rounded-2xl border border-teal-100">
                <p className="text-xs text-teal-600 font-bold uppercase">RTE Admitted Students</p>
                <p className="text-2xl font-bold text-teal-900 mt-1">{analytics?.rte_stats.rte_students || 0}</p>
              </div>
              <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                <p className="text-xs text-emerald-600 font-bold uppercase">Quota Fulfillment</p>
                <p className="text-2xl font-bold text-emerald-900 mt-1">{analytics?.rte_stats.rte_percentage || 0}%</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: BOARD MEETINGS */}
      {activeTab === "meetings" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-gray-900">Trustee Board Meetings & Minutes</h3>
              <p className="text-xs text-gray-500">Schedule meetings, track resolutions, and archive official minutes</p>
            </div>
            <Button onClick={() => setShowMeetingModal(true)} className="bg-emerald-800 hover:bg-emerald-900 text-white">
              <Plus className="mr-1.5 h-4 w-4" /> Schedule Meeting
            </Button>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4">Title & Agenda</th>
                    <th className="px-6 py-4">Date & Time</th>
                    <th className="px-6 py-4">Location</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {meetings.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-gray-400">
                        No board meetings scheduled yet.
                      </td>
                    </tr>
                  ) : (
                    meetings.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50/70">
                        <td className="px-6 py-4">
                          <div className="font-bold text-gray-900">{m.title}</div>
                          <div className="text-xs text-gray-500 line-clamp-1">{m.agenda}</div>
                        </td>
                        <td className="px-6 py-4 text-gray-700">
                          {m.meeting_date} {m.meeting_time ? `• ${m.meeting_time}` : ""}
                        </td>
                        <td className="px-6 py-4 text-gray-600">{m.location || "Board Room"}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                              m.status === "COMPLETED"
                                ? "bg-emerald-50 text-emerald-700"
                                : m.status === "CANCELLED"
                                ? "bg-rose-50 text-rose-700"
                                : "bg-blue-50 text-blue-700"
                            }`}
                          >
                            {m.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              if (confirm("Delete this meeting record?")) {
                                await deleteBoardMeeting(m.id);
                                fetchStaffData();
                              }
                            }}
                            className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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

      {/* TAB 4: STAFF DIRECTORY (Existing Working Functionality) */}
      {activeTab === "staff" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-gray-900">Institutional Staff Directory</h3>
              <p className="text-xs text-gray-500">Manage credentials and roles for school employees</p>
            </div>
            <Button
              onClick={() => {
                setIsAdding((prev) => !prev);
                setIsEditing(false);
              }}
              className="bg-emerald-800 hover:bg-emerald-900 text-white font-medium"
            >
              {isAdding ? "Close Form" : "+ Add Staff Member"}
            </Button>
          </div>

          <AnimatePresence>
            {isAdding && (
              <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm"
              >
                <form onSubmit={handleSubmit} className="grid gap-5 md:grid-cols-2 items-start">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      placeholder="Staff name"
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      placeholder="Staff email"
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mobile">Phone Number *</Label>
                    <Input
                      id="mobile"
                      value={formData.mobile}
                      placeholder="Staff phone"
                      onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <select
                      id="category"
                      value={formData.category || ""}
                      onChange={(e) => setFormData({ ...formData, category: Number(e.target.value) as any })}
                      required
                      className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none"
                    >
                      <option value="">Select Category</option>
                      {staffCategories.map((cat: any, i: number) => (
                        <option key={`${cat.feature_id}-${i}`} value={cat.feature_id}>
                          {cat.feature_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address">Address *</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="salary">Salary (₹) *</Label>
                    <Input
                      id="salary"
                      type="number"
                      value={formData.salary}
                      onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dob">Date of Birth *</Label>
                    <Input
                      id="dob"
                      type="date"
                      max={maxAllowedDob}
                      value={formData.date_of_birth}
                      onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                      required
                    />
                  </div>
                  <div className="md:col-span-2 flex justify-end">
                    <Button type="submit" disabled={isSubmitting} className="bg-emerald-800 hover:bg-emerald-900 text-white">
                      Create Staff
                    </Button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4">Staff Member</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Contact</th>
                    <th className="px-6 py-4">Salary</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {staff.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/70">
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-900">{m.name}</div>
                        <div className="text-xs text-gray-500">ID #{m.id}</div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{categoryLabel(m.category)}</td>
                      <td className="px-6 py-4 text-xs text-gray-600">
                        <div>{m.email}</div>
                        <div>{m.mobile}</div>
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-900">₹{m.salary || "—"}</td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            m.is_active ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                          }`}
                        >
                          {m.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActive(m)}
                            title={m.is_active ? "Deactivate" : "Activate"}
                            className="h-8 w-8 p-0 text-amber-600 hover:bg-amber-50"
                          >
                            <Power className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(m.id)}
                            className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SCHEDULE BOARD MEETING */}
      <AnimatePresence>
        {showMeetingModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-gray-100"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
                <h3 className="text-lg font-bold text-gray-900">Schedule Trustee Board Meeting</h3>
                <button onClick={() => setShowMeetingModal(false)} className="rounded-full p-1 text-gray-400">✕</button>
              </div>

              <form onSubmit={handleSaveMeeting} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="bm_title">Meeting Title *</Label>
                  <Input
                    id="bm_title"
                    placeholder="e.g. Q3 Annual Infrastructure & Budget Review"
                    value={meetingForm.title}
                    onChange={(e) => setMeetingForm({ ...meetingForm, title: e.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="bm_date">Date *</Label>
                    <Input
                      id="bm_date"
                      type="date"
                      value={meetingForm.meeting_date}
                      onChange={(e) => setMeetingForm({ ...meetingForm, meeting_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="bm_time">Time</Label>
                    <Input
                      id="bm_time"
                      placeholder="10:00 AM"
                      value={meetingForm.meeting_time}
                      onChange={(e) => setMeetingForm({ ...meetingForm, meeting_time: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="bm_loc">Location / Video Link</Label>
                  <Input
                    id="bm_loc"
                    placeholder="Board Room or Google Meet link"
                    value={meetingForm.location}
                    onChange={(e) => setMeetingForm({ ...meetingForm, location: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="bm_agenda">Meeting Agenda *</Label>
                  <Input
                    id="bm_agenda"
                    placeholder="Key items to discuss..."
                    value={meetingForm.agenda}
                    onChange={(e) => setMeetingForm({ ...meetingForm, agenda: e.target.value })}
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowMeetingModal(false)}>Cancel</Button>
                  <Button type="submit" disabled={isSubmitting} className="bg-emerald-800 hover:bg-emerald-900 text-white">
                    Schedule Meeting
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
