"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, GraduationCap, FileText, ClipboardList, X } from "lucide-react";
import { fetchDashboardCount, type DashboardCount, getAllStudents } from "@/lib/principal";
import { fetchAdmissions } from "@/lib/clerk/admissions";
import { getStaffList } from "@/lib/staff";
import type { Staff } from "@/types";
import { Loader2 } from "lucide-react";

const ROLE_COLORS: Record<string, string> = {
  TEACHER: "bg-blue-100 text-blue-700",
  CLERK: "bg-purple-100 text-purple-700",
  "FEES MANAGEMENT": "bg-orange-100 text-orange-700",
  PRINCIPAL: "bg-green-100 text-green-700",
  LIBRARIAN: "bg-pink-100 text-pink-700",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

function Avatar({ name }: { name: string }) {
  const initials = (name || "?").split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
  return (
    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 shrink-0">
      {initials}
    </span>
  );
}

export default function PrincipalDashboard() {
  const [data, setData] = useState<DashboardCount | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [admissions, setAdmissions] = useState<any[]>([]);
  const [modalLoading, setModalLoading] = useState(false);

  const handleCardClick = async (label: string) => {
    setActiveModal(label);
    setModalLoading(true);
    try {
      if (label === "Total Students" && students.length === 0) {
        const res = await getAllStudents();
        setStudents(res);
      } else if (label === "Teaching Staff" && staff.length === 0) {
        const res = await getStaffList();
        setStaff(res.filter((s) => s.category?.toUpperCase() !== "PRINCIPAL"));
      } else if (label === "Incomplete Admissions" && admissions.length === 0) {
        const res = await fetchAdmissions();
        setAdmissions(res.filter((a) => (a.status as string) !== "completed"));
      }
    } catch (err) {
      console.error("Failed to load details", err);
    } finally {
      setModalLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardCount().then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  const stats = [
    { label: "Total Students", value: loading ? "..." : (data?.total_student ?? 0).toLocaleString(), icon: GraduationCap, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
    { label: "Teaching Staff", value: loading ? "..." : (data?.total_staff ?? 0).toLocaleString(), icon: Users, color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-100" },
    { label: "Active Forms", value: "3", icon: ClipboardList, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
    { label: "Incomplete Admissions", value: loading ? "..." : (data?.admission_not_complete ?? 0).toLocaleString(), icon: FileText, color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-100" },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Principal Dashboard</h2>
        <p className="text-sm text-gray-500 mt-1">Overview of school activities and administration.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          const clickable = stat.label !== "Active Forms";
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              onClick={() => clickable && handleCardClick(stat.label)}
              className={`rounded-2xl border ${stat.border} bg-white p-6 shadow-sm flex items-center gap-4 select-none ${clickable ? "cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all duration-200" : ""}`}
            >
              <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}><Icon className="h-6 w-6" /></div>
              <div>
                <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 leading-tight">{stat.value}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-8 sm:p-12 text-center shadow-sm">
        <h3 className="text-xl font-semibold text-gray-900">Welcome back, Principal!</h3>
        <p className="mt-2 text-gray-500 max-w-lg mx-auto">
          Use the side navigation to manage admission forms, view student records, and oversee staff activities.
          Click the cards above to see a detailed breakdown.
        </p>
      </div>

      {activeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setActiveModal(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{activeModal}</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {activeModal === "Teaching Staff" && `${staff.length} member(s)`}
                  {activeModal === "Total Students" && `${students.length} student(s)`}
                  {activeModal === "Incomplete Admissions" && `${admissions.length} pending`}
                </p>
              </div>
              <button onClick={() => setActiveModal(null)} className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              {modalLoading ? (
                <div className="flex justify-center items-center h-48">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
                </div>
              ) : (
                <>
                  {activeModal === "Teaching Staff" && (
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-gray-50 border-b border-gray-100 z-10">
                        <tr>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase w-10">#</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Role</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Email</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Contact</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {staff.length === 0 ? (
                          <tr><td colSpan={5} className="text-center text-gray-400 py-12">No staff found.</td></tr>
                        ) : staff.map((s, i) => (
                          <tr key={s.id} className="hover:bg-gray-50/80 transition-colors">
                            <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                            <td className="px-4 py-3"><div className="flex items-center gap-3"><Avatar name={s.name || ""} /><span className="font-medium text-gray-900">{s.name}</span></div></td>
                            <td className="px-4 py-3"><span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${ROLE_COLORS[s.category?.toUpperCase() ?? ""] || "bg-gray-100 text-gray-600"}`}>{s.category}</span></td>
                            <td className="px-4 py-3 text-gray-600">{s.email || "—"}</td>
                            <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{s.mobile || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {activeModal === "Total Students" && (
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-gray-50 border-b border-gray-100 z-10">
                        <tr>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase w-10">#</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Class</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Email</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Contact</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {students.length === 0 ? (
                          <tr><td colSpan={5} className="text-center text-gray-400 py-12">No students found.</td></tr>
                        ) : students.map((s: any, i) => (
                          <tr key={s.id} className="hover:bg-gray-50/80 transition-colors">
                            <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                            <td className="px-4 py-3"><div className="flex items-center gap-3"><Avatar name={`${s.name || ""} ${s.surname || ""}`.trim()} /><span className="font-medium text-gray-900">{s.name} {s.surname}</span></div></td>
                            <td className="px-4 py-3"><span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">{s.class_name || "—"}</span></td>
                            <td className="px-4 py-3 text-gray-600">{s.email || "—"}</td>
                            <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{s.mobile || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {activeModal === "Incomplete Admissions" && (
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-gray-50 border-b border-gray-100 z-10">
                        <tr>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase w-10">#</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Student Name</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Phone</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Class</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {admissions.length === 0 ? (
                          <tr><td colSpan={5} className="text-center text-gray-400 py-12">No incomplete admissions.</td></tr>
                        ) : admissions.map((a: any, i) => (
                          <tr key={a.id} className="hover:bg-gray-50/80 transition-colors">
                            <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                            <td className="px-4 py-3 font-medium text-gray-900">{a.student_name}</td>
                            <td className="px-4 py-3"><span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[a.status] || "bg-gray-100 text-gray-600"}`}>{a.status}</span></td>
                            <td className="px-4 py-3 text-gray-600">{a.phone_number || "—"}</td>
                            <td className="px-4 py-3 text-gray-600">{a.standard_applying_for || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

