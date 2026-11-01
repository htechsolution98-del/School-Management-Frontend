"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Building2,
  Loader2,
  Plus,
  RefreshCw,
  Pencil,
  Trash2,
  Users,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from "@/lib/staff";
import { parseDepartments } from "@/lib/clerk/hr-validation";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import type { Department } from "@/types";
import "../clerk-workspace.css";

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [progress, setProgress] = useState("");
  const busy = useRef(false);

  // Edit modal state
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [editName, setEditName] = useState("");
  const [editError, setEditError] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setDepartments(await getDepartments());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load departments.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy.current || loading) return;
    setError("");
    setSuccess("");
    const parsed = parseDepartments(input, departments);
    if (parsed.error) {
      setError(parsed.error);
      return;
    }
    busy.current = true;
    setSubmitting(true);
    const created: Department[] = [];
    const failed: string[] = [];
    const messages: string[] = [];
    try {
      for (const [index, name] of parsed.names.entries()) {
        setProgress(`Creating ${index + 1} of ${parsed.names.length} departments`);
        try {
          created.push(await createDepartment(name));
        } catch (err) {
          failed.push(name);
          messages.push(`${name}: ${err instanceof Error ? err.message : "Creation failed"}`);
        }
      }
      setDepartments((previous) => [...previous, ...created]);
      setInput(failed.join(", "));
      if (created.length) {
        setSuccess(`${created.length} department${created.length === 1 ? "" : "s"} created successfully.`);
        toast.success(`${created.length} department${created.length === 1 ? "" : "s"} created successfully.`);
      }
      if (failed.length) {
        setError(`${messages.join("; ")}. Only unsuccessful names remain in the form for retry.`);
      }
    } finally {
      busy.current = false;
      setSubmitting(false);
      setProgress("");
    }
  };

  // Open Edit Dialog
  const handleOpenEdit = useCallback((dept: Department) => {
    setEditingDept(dept);
    setEditName(dept.name);
    setEditError("");
  }, []);

  // Save Edit Department
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDept || isSavingEdit) return;

    const trimmed = editName.trim();
    if (!trimmed) {
      setEditError("Department name cannot be blank.");
      return;
    }
    if (trimmed.length > 100) {
      setEditError("Department name cannot exceed 100 characters.");
      return;
    }
    if (trimmed.toLowerCase() === editingDept.name.toLowerCase()) {
      setEditingDept(null);
      return;
    }
    if (
      departments.some(
        (d) => d.id !== editingDept.id && d.name.toLowerCase() === trimmed.toLowerCase()
      )
    ) {
      setEditError("A department with this name already exists in your school.");
      return;
    }

    setIsSavingEdit(true);
    setEditError("");
    try {
      const updated = await updateDepartment(editingDept.id, trimmed);
      setDepartments((previous) =>
        previous.map((d) =>
          d.id === editingDept.id
            ? { ...d, ...updated, name: trimmed }
            : d
        )
      );
      toast.success(`Department renamed to "${trimmed}".`);
      setEditingDept(null);
    } catch (err: any) {
      setEditError(err?.message || "Failed to update department.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Open Delete Dialog
  const handleOpenDelete = useCallback((dept: Department) => {
    setDeleteTarget(dept);
    setDeleteError("");
  }, []);

  // Confirm Delete Department
  const handleConfirmDelete = async () => {
    if (!deleteTarget || isDeleting) return;

    const staffCount = deleteTarget.staff_count ?? deleteTarget.total_staff ?? 0;
    if (staffCount > 0) {
      setDeleteError(
        `Cannot delete: ${staffCount} staff member${staffCount === 1 ? " is" : "s are"} assigned to this department. Please reassign them before deleting.`
      );
      return;
    }

    setIsDeleting(true);
    setDeleteError("");
    try {
      await deleteDepartment(deleteTarget.id);
      setDepartments((previous) => previous.filter((d) => d.id !== deleteTarget.id));
      toast.success(`Department "${deleteTarget.name}" deleted successfully.`);
      setDeleteTarget(null);
    } catch (err: any) {
      const msg = err?.message || "Failed to delete department.";
      setDeleteError(msg);
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const columns = useMemo<DataTableColumn<Department>[]>(
    () => [
      {
        key: "id",
        header: "ID",
        search: (row) => String(row.id),
        render: (row) => <span className="font-mono text-slate-400">#{row.id}</span>,
      },
      {
        key: "name",
        header: "Department",
        sticky: true,
        search: (row) => row.name,
        camelCase: false,
        render: (row) => (
          <span className="flex items-center gap-3 font-medium">
            <span className="hr-avatar">
              <Building2 size={16} />
            </span>
            {row.name}
          </span>
        ),
      },
      {
        key: "total_staff",
        header: "Total Staff",
        search: (row) => String(row.staff_count ?? row.total_staff ?? 0),
        render: (row) => {
          const count = row.staff_count ?? row.total_staff ?? 0;
          return (
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                count > 0
                  ? "bg-indigo-50 text-indigo-700 border border-indigo-200/60"
                  : "bg-slate-100 text-slate-500 border border-slate-200/50"
              }`}
            >
              <Users size={13} className={count > 0 ? "text-indigo-600" : "text-slate-400"} />
              <span>
                {count} {count === 1 ? "Staff Member" : "Staff Members"}
              </span>
            </span>
          );
        },
      },
      {
        key: "actions",
        header: "Actions",
        render: (row) => {
          const count = row.staff_count ?? row.total_staff ?? 0;
          return (
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleOpenEdit(row)}
                className="h-8 w-8 p-0 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer transition-colors"
                title={`Edit ${row.name}`}
              >
                <Pencil size={15} />
                <span className="sr-only">Edit {row.name}</span>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleOpenDelete(row)}
                className={`h-8 w-8 p-0 rounded-lg cursor-pointer transition-colors ${
                  count > 0
                    ? "text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                    : "text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                }`}
                title={
                  count > 0
                    ? `Cannot delete: ${count} staff members assigned`
                    : `Delete ${row.name}`
                }
              >
                <Trash2 size={15} />
                <span className="sr-only">Delete {row.name}</span>
              </Button>
            </div>
          );
        },
      },
    ],
    [handleOpenEdit, handleOpenDelete]
  );

  const preview = input
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);

  const targetStaffCount =
    deleteTarget ? (deleteTarget.staff_count ?? deleteTarget.total_staff ?? 0) : 0;
  const isProtectedFromDelete = targetStaffCount > 0;

  return (
    <div className="clerk-page hr-page space-y-6">
      {/* ── Top: Create Departments ── */}
      <section className="hr-panel w-full">
        <div className="hr-panel-heading">
          <span className="hr-avatar">
            <Plus size={18} />
          </span>
          <div>
            <h2>Create departments</h2>
            <p>Add one or multiple departments in a single step (separated by commas).</p>
          </div>
        </div>
        <form onSubmit={create} className="space-y-4">
          <div>
            <label htmlFor="department-names" className="hr-field-label">
              Department names
            </label>
            <textarea
              id="department-names"
              rows={3}
              value={input}
              disabled={submitting}
              aria-invalid={!!error}
              aria-describedby="department-help department-error"
              onChange={(event) => {
                setInput(event.target.value);
                setError("");
                setSuccess("");
              }}
              placeholder="e.g. Science, Mathematics, Administration, Physical Education"
              className="hr-textarea"
            />
            <p id="department-help" className="mt-1 text-xs text-slate-500">
              Separate each name with a comma. Maximum 100 characters per name.
            </p>
          </div>

          {!!preview.length && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                Departments to create ({preview.length}):
              </span>
              <div className="flex flex-wrap gap-2">
                {preview.map((name, index) => (
                  <span key={index} className="hr-chip">
                    {name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {error && (
            <p id="department-error" role="alert" className="hr-error text-xs">
              {error}
            </p>
          )}
          {success && (
            <p role="status" className="hr-success text-xs">
              {success}
            </p>
          )}

          <div className="flex justify-end pt-1">
            <Button
              type="submit"
              disabled={loading || submitting || !input.trim()}
              className="bg-[#5826df] hover:bg-[#4a1ec2] text-white rounded-xl shadow-md shadow-indigo-500/20 active:scale-95 px-6 h-10 font-semibold"
            >
              {submitting ? (
                <Loader2 size={15} className="animate-spin mr-2" />
              ) : (
                <Plus size={15} className="mr-2" />
              )}
              {submitting
                ? progress
                : `Create ${preview.length > 1 ? `${preview.length} departments` : "department"}`}
            </Button>
          </div>
        </form>
      </section>

      {/* ── Bottom: Department Directory Table ── */}
      <section className="hr-directory w-full min-w-0">
        <div className="hr-directory-heading">
          <div>
            <h2>Department directory</h2>
            <p>{departments.length} departments in your school</p>
          </div>
          <Button
            variant="outline"
            disabled={loading || submitting}
            onClick={() => {
              setError("");
              void load();
            }}
            className="text-xs font-semibold gap-1.5"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </Button>
        </div>
        <DataTable
          data={departments}
          columns={columns}
          getRowId={(row) => row.id}
          loading={loading}
          search
          searchPlaceholder="Search department names..."
          createdDate
          createdDateRange
          minWidth={540}
          emptyTitle="No departments yet"
          emptyDescription="Add your first department using the form above."
          caption="School departments"
        />
      </section>

      {/* ── Edit Department Modal ── */}
      <Dialog
        open={editingDept !== null}
        onOpenChange={(open) => {
          if (!open && !isSavingEdit) {
            setEditingDept(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md rounded-2xl">
          <form onSubmit={handleSaveEdit}>
            <DialogHeader>
              <div className="flex items-center gap-2 text-indigo-600 mb-1">
                <span className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                  <Pencil size={16} />
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                  HR Management
                </span>
              </div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                Edit Department
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Update the official title for this department. All assigned staff will automatically reflect the updated name.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-3">
              <div>
                <label htmlFor="edit-dept-name" className="text-xs font-bold text-slate-700 block mb-1">
                  Department Name
                </label>
                <input
                  id="edit-dept-name"
                  type="text"
                  value={editName}
                  disabled={isSavingEdit}
                  onChange={(e) => {
                    setEditName(e.target.value);
                    setEditError("");
                  }}
                  maxLength={100}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-hidden transition-all bg-white font-medium"
                  placeholder="e.g. Science"
                  autoFocus
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  {editName.length}/100 characters
                </span>
              </div>

              {editError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-start gap-2">
                  <AlertTriangle size={15} className="shrink-0 mt-0.5 text-rose-600" />
                  <span>{editError}</span>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                disabled={isSavingEdit}
                onClick={() => setEditingDept(null)}
                className="rounded-xl text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSavingEdit || !editName.trim()}
                className="bg-[#5826df] hover:bg-[#4a1ec2] text-white rounded-xl text-xs font-semibold px-5"
              >
                {isSavingEdit ? (
                  <>
                    <Loader2 size={14} className="animate-spin mr-1.5" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Changes</span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Protected Delete / Confirmation Modal ── */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setDeleteTarget(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center mb-1.5 ${
                isProtectedFromDelete ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600"
              }`}
            >
              {isProtectedFromDelete ? <AlertTriangle size={20} /> : <Trash2 size={20} />}
            </div>
            <DialogTitle className="text-lg font-bold text-slate-900">
              {isProtectedFromDelete ? "Cannot Delete Department" : "Delete Department?"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {isProtectedFromDelete
                ? "This department currently has active staff members assigned to it and is protected from deletion."
                : `Are you sure you want to delete the department "${deleteTarget?.name}"? This action cannot be undone.`}
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-3">
            {isProtectedFromDelete ? (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs space-y-1.5 leading-relaxed">
                <div className="font-bold flex items-center gap-1.5 text-amber-800">
                  <Users size={14} />
                  <span>
                    Cannot delete: {targetStaffCount} staff member{targetStaffCount === 1 ? "" : "s"} assigned to this department.
                  </span>
                </div>
                <p className="text-amber-700">
                  Please reassign all staff members to another department before deleting.
                </p>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                <p>
                  Department: <strong className="text-slate-900 font-semibold">{deleteTarget?.name}</strong>
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Assigned Staff: 0 members (Safe to delete)
                </p>
              </div>
            )}

            {deleteError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-start gap-2">
                <AlertTriangle size={15} className="shrink-0 mt-0.5 text-rose-600" />
                <span>{deleteError}</span>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            {isProtectedFromDelete ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteTarget(null)}
                className="w-full sm:w-auto rounded-xl text-xs font-semibold"
              >
                Understood
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isDeleting}
                  onClick={() => setDeleteTarget(null)}
                  className="rounded-xl text-xs font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmDelete}
                  className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold px-5"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 size={14} className="animate-spin mr-1.5" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <span>Delete Department</span>
                  )}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
