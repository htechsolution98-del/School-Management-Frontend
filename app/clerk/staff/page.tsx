"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  MoreHorizontal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createStaff, getStaffCategories, getStaffList, updateStaff, deleteStaff, getDepartments } from "@/lib/staff";
import { toHTMLDate, toApiDate } from "@/lib/dateUtils";
import { CreateStaffPayload, Staff, StaffCategory, Department } from "@/types";

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
  department: undefined,
  address: "",
  date_of_birth: "",
  salary: "",
  is_active: true,
};

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export default function ClerkStaffDashboard() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [formData, setFormData] = useState<CreateStaffPayload>(EMPTY_FORM);
  const [isAdding, setIsAdding] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [staffCategories, setStaffCategories] = useState<any[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  // Edit / Delete State
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<CreateStaffPayload>(EMPTY_FORM);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleEditClick = (staff: Staff) => {
    setEditingStaff(staff);
    // Find the feature_id for the staff's category string
    const matchCat = staffCategories.find(c => 
      c.feature_name.toUpperCase() === String(staff.category).toUpperCase()
    );
    const categoryId = matchCat ? matchCat.feature_id : staff.category;

    setEditFormData({
      name: staff.name || "",
      email: staff.email || "",
      mobile: staff.mobile || "",
      category: categoryId as any,
      department: staff.department || undefined,
      address: staff.address || "",
      date_of_birth: staff.date_of_birth || "",
      salary: staff.salary || "",
      is_active: staff.is_active,
    });
    setIsEditing(true);
    setIsAdding(false);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    setIsUpdating(true);
    setError("");
    setSuccessMsg("");
    try {
      await updateStaff(editingStaff.id, editFormData);
      setSuccessMsg("Staff member updated successfully.");
      setIsEditing(false);
      setEditingStaff(null);
      await fetchStaff();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to update staff."));
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
      await fetchStaff();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to delete staff."));
    }
  };

  const handleToggleActive = async (member: Staff) => {
    setError("");
    setSuccessMsg("");
    try {
      await updateStaff(member.id, { is_active: !member.is_active });
      setSuccessMsg(`Staff member ${member.is_active ? "deactivated" : "activated"} successfully.`);
      await fetchStaff();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to update staff status."));
    }
  };

  const fetchCategories = useCallback(async () => {
    try {
      const data = await getStaffCategories();
      console.log("categories :", data);

      const allowedRoles = ["CLERK", "ASSISTANT CLERK", "PRINCIPAL", "VICE PRINCIPAL", "FEES MANAGEMENT", "TEACHER", "INVENTORY", "LIBRARIAN", "TRANSPORTATION"];
      const filteredData = data.filter((c: any) => allowedRoles.includes(c.feature_name));
      setStaffCategories(filteredData);
    } catch (err) {
      console.log(err);
    }
  }, []);

  const fetchDepartments = useCallback(async () => {
    try {
      const data = await getDepartments();
      setDepartments(data);
    } catch (err) {
      console.log(err);
    }
  }, []);

  const activeCount = useMemo(
    () => staff.filter((member) => member.is_active).length,
    [staff],
  );

  const fetchStaff = useCallback(async () => {
    setIsFetching(true);
    setError("");
    try {
      const data = await getStaffList();
      console.log("data : ", data);
      setStaff(data);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to load staff."));
    } finally {
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    fetchStaff();
    fetchCategories();
    fetchDepartments();
  }, [fetchStaff, fetchCategories, fetchDepartments]);

  const handleInputChange =
    (field: keyof CreateStaffPayload) =>
      (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const value =
          field === "is_active"
            ? event.target.value === "true"
            : field === "category"
              ? Number(event.target.value)
              : event.target.value;

        setFormData((prev) => ({
          ...prev,
          [field]: value,
        }));
      };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    setSuccessMsg("");

    try {
      await createStaff(formData);
      setSuccessMsg("Staff member created successfully.");
      setFormData(EMPTY_FORM);
      setIsAdding(false);
      await fetchStaff();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to create staff."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const categoryLabel = (category: StaffCategory) =>
    STAFF_CATEGORIES.find((item) => item.value === category)?.label ?? category;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="grid gap-4 md:grid-cols-[1.5fr_1fr_1fr]">
        <div className="rounded-3xl border border-teal-100 bg-gradient-to-br from-teal-600 via-cyan-600 to-emerald-500 p-6 text-white shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-white/80">
                Trustee Staff Directory
              </p>
              <h2 className="text-3xl font-bold tracking-tight">
                Manage staff records
              </h2>
              <p className="max-w-xl text-sm text-white/80">
                Review all staff entries and create new records directly from
                the trustee panel.
              </p>
            </div>
            <div className="rounded-2xl bg-white/15 p-3">
              <Users className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              onClick={() => {
                setIsAdding((prev) => !prev);
                setIsEditing(false);
                setError("");
                setSuccessMsg("");
              }}
              className="bg-white text-teal-700 hover:bg-teal-50"
            >
              {isAdding ? (
                <>
                  <X className="mr-2 h-4 w-4" />
                  Close Form
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Staff
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={fetchStaff}
              disabled={isFetching}
              className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Total Staff</p>
          <p className="mt-3 text-3xl font-bold text-gray-900">
            {staff.length}
          </p>
          <p className="mt-1 text-sm text-gray-500">Total staff members.</p>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Active Staff</p>
          <p className="mt-3 text-3xl font-bold text-gray-900">{activeCount}</p>
          <p className="mt-1 text-sm text-gray-500">
            Members currently marked active.
          </p>
        </div>
      </div>

      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700"
          >
            {successMsg}
          </motion.div>
        )}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm"
          >
            <div className="mb-5">
              <h3 className="text-xl font-semibold text-gray-900">
                Create staff record
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-5 md:grid-cols-2 items-start">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  placeholder="Staff name"
                  onChange={handleInputChange("name")}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  placeholder="Staff email"
                  onChange={handleInputChange("email")}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mobile">Phone Number</Label>
                <Input
                  id="mobile"
                  value={formData.mobile}
                  placeholder="Staff phone number"
                  onChange={handleInputChange("mobile")}
                  required
                />
              </div>

              <div className="space-y-2 relative z-20">
                <Label htmlFor="department">Department</Label>
                <select
                  id="department"
                  value={formData.department || ""}
                  onChange={(e) => setFormData({ ...formData, department: Number(e.target.value) || undefined })}
                  className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none"
                  required
                >
                  <option value="">Select Department</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 relative z-20">
                <Label htmlFor="category">Role</Label>
                <select
                  id="category"
                  value={formData.category || ""}
                  onChange={handleInputChange("category")}
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none"
                >
                  <option value="">Select Role</option>

                  {staffCategories.map((category: any, index: number) => {
                    const match = STAFF_CATEGORIES.find(
                      (s) => s.value === category.feature_name
                    )
                    return (
                      <option
                        key={`${category.feature_id}-${index}`}
                        value={category.feature_id}
                      >
                        {match ? match.label : category.feature_name
                          .charAt(0).toUpperCase() + category.feature_name.slice(1).toLowerCase()}
                      </option>
                    )
                  })}
                </select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={handleInputChange("address")}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date_of_birth">Date of Birth</Label>
                <Input
                  id="date_of_birth"
                  type="text"
                  value={toHTMLDate(formData.date_of_birth)}
                  onChange={(e) => setFormData({ ...formData, date_of_birth: toApiDate(e.target.value) })}
                  onFocus={(e) => (e.target.type = "date")}
                  onBlur={(e) => { if (!e.target.value) e.target.type = "text" }}
                  required
                  placeholder="YYYY-MM-DD"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="salary">Salary</Label>
                <Input
                  id="salary"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.salary}
                  onChange={handleInputChange("salary")}
                  required
                />
              </div>

              <div className="space-y-2 relative z-10">
                <Label htmlFor="is_active">Status</Label>
                <select
                  id="is_active"
                  value={String(formData.is_active)}
                  onChange={handleInputChange("is_active")}
                  className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm shadow-xs outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>

              <div className="md:col-span-2 flex justify-end">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <UserPlus className="mr-2 h-4 w-4" />
                  )}
                  {isSubmitting ? "Saving..." : "Create Staff"}
                </Button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm mb-6 relative"
          >
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-4"
              onClick={() => setIsEditing(false)}
            >
              <X className="h-4 w-4" />
            </Button>
            <div className="mb-5">
              <h3 className="text-xl font-semibold text-gray-900">
                Edit Staff: {editingStaff?.name}
              </h3>
            </div>

            <form onSubmit={handleEditSubmit} className="grid gap-5 md:grid-cols-2 items-start">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone Number</Label>
                <Input
                  id="edit-phone"
                  value={editFormData.mobile}
                  onChange={(e) => setEditFormData({ ...editFormData, mobile: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2 relative z-20">
                <Label htmlFor="edit-department">Department</Label>
                <select
                  id="edit-department"
                  value={editFormData.department || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, department: Number(e.target.value) || undefined })}
                  className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none"
                  required
                >
                  <option value="">Select Department</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 relative z-20">
                <Label htmlFor="edit-category">Role</Label>
                <select
                  id="edit-category"
                  value={editFormData.category || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, category: Number(e.target.value) as unknown as StaffCategory })}
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none"
                >
                  <option value="">Select Role</option>
                  {staffCategories.map((category: any, index: number) => {
                    const match = STAFF_CATEGORIES.find((s) => s.value === category.feature_name);
                    return (
                      <option key={`${category.feature_id}-${index}`} value={category.feature_id}>
                        {match ? match.label : category.feature_name}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-address">Address</Label>
                <Input
                  id="edit-address"
                  value={editFormData.address}
                  onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-dob">Date of Birth</Label>
                <Input
                  id="edit-dob"
                  type="date"
                  value={toHTMLDate(editFormData.date_of_birth)}
                  onChange={(e) => setEditFormData({ ...editFormData, date_of_birth: toApiDate(e.target.value) })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-salary">Salary</Label>
                <Input
                  id="edit-salary"
                  type="number"
                  value={editFormData.salary}
                  onChange={(e) => setEditFormData({ ...editFormData, salary: e.target.value })}
                  required
                />
              </div>

              <div className="md:col-span-2 flex justify-end">
                <Button type="submit" disabled={isUpdating} className="bg-teal-600 hover:bg-teal-700 text-white">
                  {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Edit2 className="mr-2 h-4 w-4" />}
                  {isUpdating ? "Updating..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="rounded-3xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-900">Staff list</h3>
          <p className="text-sm text-gray-500">Live data from the staff API.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-6 py-4">Staff</th>
                <th className="px-6 py-4">Department</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">Address</th>
                <th className="px-6 py-4">DOB</th>
                <th className="px-6 py-4">Joined</th>
                <th className="px-6 py-4">Salary</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isFetching ? (
                <tr>
                  <td colSpan={10} className="px-6 py-14 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-teal-600" />
                    <p className="mt-2 text-sm text-gray-500">
                      Loading staff...
                    </p>
                  </td>
                </tr>
              ) : staff.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-14 text-center">
                    <Users className="mx-auto h-8 w-8 text-gray-300" />
                    <p className="mt-2 text-sm text-gray-500">
                      No staff records found.
                    </p>
                  </td>
                </tr>
              ) : (
                staff.map((member, index) => (
                  <motion.tr
                    key={member.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.03 }}
                    className="align-top hover:bg-slate-50/70"
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">
                        {member.name || "-"}
                      </div>
                      <div className="text-xs text-gray-500">
                        ID #{member.id}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {departments.find((d) => d.id === member.department)?.name || "-"}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {categoryLabel(member.category)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1 text-gray-600">
                        <div className="flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5 text-gray-400" />
                          <span>{member.email || "-"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 text-gray-400" />
                          <span>{member.mobile || "-"}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      <div className="flex items-start gap-2">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 text-gray-400" />
                        <span>{member.address || "-"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-gray-400" />
                        <span>{member.date_of_birth || "-"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {member.joining_date || "-"}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      <div className="flex items-center gap-2">
                        <BadgeIndianRupee className="h-3.5 w-3.5 text-gray-400" />
                        <span>{member.salary || "-"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${member.is_active
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-red-50 text-red-700"
                          }`}
                      >
                        {member.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleActive(member)}
                          title={member.is_active ? "Deactivate" : "Activate"}
                          className={member.is_active ? "text-amber-600 hover:text-amber-700 hover:bg-amber-50" : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"}
                        >
                          <Power className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditClick(member)}
                          title="Edit"
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(member.id)}
                          title="Delete"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
