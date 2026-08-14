"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Plus, Users, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getDepartments, createDepartment } from "@/lib/staff";
import { Department } from "@/types";

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newDepartmentName, setNewDepartmentName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      setIsLoading(true);
      const data = await getDepartments();
      setDepartments(data);
    } catch (err: any) {
      setError(err.message || "Failed to load departments");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDepartmentName.trim()) return;

    try {
      setIsSubmitting(true);
      setError("");
      setSuccess("");
      await createDepartment(newDepartmentName.trim());
      setSuccess("Department created successfully!");
      setNewDepartmentName("");
      fetchDepartments();
    } catch (err: any) {
      setError(err.message || "Failed to create department");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Departments</h1>
          <p className="text-sm text-gray-500 mt-1">Manage school departments and HR structures</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create Form */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sticky top-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-600" />
              Create Department
            </h2>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-600 text-sm border border-red-100">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 text-emerald-600 text-sm border border-emerald-100">
                {success}
              </div>
            )}

            <form onSubmit={handleCreateDepartment} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="dept_name" className="text-sm font-medium text-gray-700">
                  Department Name
                </label>
                <Input
                  id="dept_name"
                  value={newDepartmentName}
                  onChange={(e) => setNewDepartmentName(e.target.value)}
                  placeholder="e.g. Science, HR, Administration"
                  required
                  className="rounded-xl border-gray-200 focus:border-indigo-600 focus:ring-indigo-600/20"
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting || !newDepartmentName.trim()}
                className="w-full bg-[#0D3759] hover:bg-[#0D3759]/90 text-white rounded-xl h-11"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                {isSubmitting ? "Creating..." : "Create Department"}
              </Button>
            </form>
          </div>
        </div>

        {/* List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <LayoutGrid className="w-5 h-5 text-indigo-600" />
              Existing Departments
            </h2>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <Loader2 className="h-8 w-8 animate-spin mb-4 text-indigo-600" />
                <p className="text-sm font-medium">Loading departments...</p>
              </div>
            ) : departments.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <Users className="h-10 w-10 mx-auto text-gray-300 mb-3" />
                <h3 className="text-sm font-semibold text-gray-900">No departments found</h3>
                <p className="text-sm text-gray-500 mt-1">Get started by creating a new department.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {departments.map((dept, index) => (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    key={dept.id}
                    className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 flex items-center justify-between group hover:bg-white hover:shadow-md hover:border-indigo-100 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold shrink-0">
                        {dept.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{dept.name}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Created {new Date(dept.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
