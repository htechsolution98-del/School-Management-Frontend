import sys

with open(r"c:\Users\mahil\Downloads\School Management\School-Management-Frontend\School-Management-Frontend\app\trustee\page.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Chunk 1: Imports
content = content.replace(
"""  RefreshCw,
  UserPlus,
  Users,
  X,
} from "lucide-react";""",
"""  RefreshCw,
  UserPlus,
  Users,
  X,
  Edit2,
  Trash2,
  Power,
  MoreHorizontal
} from "lucide-react";"""
)

content = content.replace(
"""import { createStaff, getStaffCategories, getStaffList } from "@/lib/staff";""",
"""import { createStaff, getStaffCategories, getStaffList, updateStaff, deleteStaff } from "@/lib/staff";"""
)

# Chunk 2: State variables
content = content.replace(
"""  const [successMsg, setSuccessMsg] = useState("");
  const [staffCategories, setStaffCategories] = useState<any[]>([]);""",
"""  const [successMsg, setSuccessMsg] = useState("");
  const [staffCategories, setStaffCategories] = useState<any[]>([]);

  // Edit / Delete State
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<CreateStaffPayload>(EMPTY_FORM);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleEditClick = (staff: Staff) => {
    setEditingStaff(staff);
    setEditFormData({
      name: staff.name || "",
      email: staff.email || "",
      phone_number: staff.phone_number || "",
      category: staff.category,
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
  };"""
)

# Chunk 3: Edit Modal
content = content.replace(
"""      <div className="rounded-3xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 px-6 py-4">""",
"""      <AnimatePresence>
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
                  value={editFormData.phone_number}
                  onChange={(e) => setEditFormData({ ...editFormData, phone_number: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2 relative z-20">
                <Label htmlFor="edit-category">Category</Label>
                <select
                  id="edit-category"
                  value={editFormData.category || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, category: Number(e.target.value) as unknown as StaffCategory })}
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none"
                >
                  <option value="">Select Category</option>
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
                  value={editFormData.date_of_birth}
                  onChange={(e) => setEditFormData({ ...editFormData, date_of_birth: e.target.value })}
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
        <div className="border-b border-gray-100 px-6 py-4">"""
)

# Chunk 4: Table structure
content = content.replace(
"""                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isFetching ? (
                <tr>
                  <td colSpan={8} className="px-6 py-14 text-center">""",
"""                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isFetching ? (
                <tr>
                  <td colSpan={9} className="px-6 py-14 text-center">"""
)

content = content.replace(
"""              ) : staff.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-14 text-center">""",
"""              ) : staff.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-14 text-center">"""
)

# Chunk 5: Action buttons
content = content.replace(
"""                      >
                        {member.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </motion.tr>""",
"""                      >
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
                  </motion.tr>"""
)


content = content.replace(
"""                setIsAdding((prev) => !prev);
                setError("");
                setSuccessMsg("");
              }}""",
"""                setIsAdding((prev) => !prev);
                setIsEditing(false);
                setError("");
                setSuccessMsg("");
              }}"""
)


with open(r"c:\Users\mahil\Downloads\School Management\School-Management-Frontend\School-Management-Frontend\app\trustee\page.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Done")
