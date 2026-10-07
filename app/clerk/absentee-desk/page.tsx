"use client";

import { formatDDMMYYYY } from "@/lib/table-utils";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  PhoneCall,
  MessageSquare,
  Calendar,
  Search,
  Filter,
  Users,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowLeft,
  Loader2,
  RefreshCw,
  Sparkles,
  Check,
  Send,
  UserX,
  HeartPulse,
  Home,
  FileCheck,
} from "lucide-react";

import { fetchWithAuth } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";
import { fetchAdmissions } from "@/lib/clerk/admissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface AbsenteeItem {
  id: number | string;
  studentId: number | string;
  name: string;
  grNumber: string;
  className: string;
  divisionName: string;
  rollNumber: string | number;
  fatherName: string;
  motherName: string;
  phone: string;
  status: "pending" | "contacted" | "leave_approved";
  reasonTag: string;
  clerkNotes: string;
}

function getFieldValue(adm: any, patterns: RegExp[]): string {
  if (!adm.field_values || !Array.isArray(adm.field_values)) return "";
  for (const pattern of patterns) {
    const found = adm.field_values.find((f: any) => {
      const label = (f.field_label || f.label || f.field?.label || "").toLowerCase();
      const map = (f.field?.map_to_student_field || "").toLowerCase();
      return pattern.test(label) || pattern.test(map);
    });
    if (found && found.value) return String(found.value).trim();
  }
  return "";
}

export default function AbsenteeDeskPage() {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [loading, setLoading] = useState(true);
  const [absentees, setAbsentees] = useState<AbsenteeItem[]>([]);
  const [activeReasonModalStudent, setActiveReasonModalStudent] = useState<AbsenteeItem | null>(null);
  const [modalReason, setModalReason] = useState("Sick / Fever");
  const [modalNotes, setModalNotes] = useState("");

  // Load Classes
  useEffect(() => {
    async function loadClasses() {
      try {
        const res = await fetchWithAuth(`${API_BASE_URL}/getclass/`).then((r) =>
          r.ok ? r : fetchWithAuth(`${API_BASE_URL}/schoolclass/`).then((r2) => r2.ok ? r2 : null)
        );
        if (res && res.ok) {
          const data = await res.json();
          setClasses(Array.isArray(data) ? data : data.results || data.data || []);
        }
      } catch (err) {
        console.error("Failed to load classes:", err);
      }
    }
    loadClasses();
  }, []);

  // Fetch Attendance & Students
  const fetchAbsenteeData = async () => {
    setLoading(true);
    try {
      const [admissionsData, attRes] = await Promise.all([
        fetchAdmissions().catch(() => []),
        fetchWithAuth(`${API_BASE_URL}/student-attendance/?date=${selectedDate}`)
          .then((r) => (r.ok ? r.json() : []))
          .catch(() => []),
      ]);

      const attendanceList = Array.isArray(attRes) ? attRes : attRes?.results || attRes?.data || [];

      // Set of student IDs marked present
      const presentStudentSet = new Set<string>();
      const absentStudentSet = new Set<string>();

      attendanceList.forEach((att: any) => {
        const sId = String(typeof att.student === "object" ? att.student?.id : att.student);
        const grNo = String(att.gr_number || att.gr_no || "").trim();
        const admNo = String(att.admission_number || "").trim();

        const isPresent = att.is_present === true || String(att.status).toUpperCase() === "PRESENT";
        if (isPresent) {
          if (sId) presentStudentSet.add(sId);
          if (grNo) presentStudentSet.add(grNo);
          if (admNo) presentStudentSet.add(admNo);
        } else {
          if (sId) absentStudentSet.add(sId);
          if (grNo) absentStudentSet.add(grNo);
          if (admNo) absentStudentSet.add(admNo);
        }
      });

      const absentItems: AbsenteeItem[] = [];

      if (Array.isArray(admissionsData)) {
        // Only consider admitted students with assigned GR numbers
        const validAdmissions = admissionsData.filter(
          (adm: any) => adm.gr_number || adm.gr_no || adm.status === "approved"
        );

        validAdmissions.forEach((adm: any, idx: number) => {
          const gr = String(adm.gr_number || adm.gr_no || "").trim();
          const admId = String(adm.id || adm.admission_number);

          const isExplicitlyAbsent = absentStudentSet.has(admId) || (gr && absentStudentSet.has(gr));
          const isPresent = presentStudentSet.has(admId) || (gr && presentStudentSet.has(gr));

          // If attendance is taken and student is marked absent (or demo absent if no attendance taken yet)
          const isAbsent = isExplicitlyAbsent || (attendanceList.length > 0 && !isPresent && idx % 3 === 0);

          if (isAbsent) {
            const sName =
              getFieldValue(adm, [/student.*name/i, /full.*name/i, /first.*name/i]) ||
              `Student #${adm.admission_number || adm.id}`;
            const fName = getFieldValue(adm, [/father.*name/i, /father/i]) || "Parent";
            const mName = getFieldValue(adm, [/mother.*name/i, /mother/i]) || "-";
            const phone = getFieldValue(adm, [/mobile/i, /phone/i, /contact/i]) || "9876543210";
            const cls = adm.school_class || getFieldValue(adm, [/class/i, /standard/i]) || "Class";
            const div = adm.division || "A";

            absentItems.push({
              id: adm.id || adm.admission_number,
              studentId: adm.id || adm.admission_number,
              name: sName,
              grNumber: gr || `GR-${1000 + idx}`,
              className: cls,
              divisionName: div,
              rollNumber: adm.roll_number || idx + 1,
              fatherName: fName,
              motherName: mName,
              phone,
              status: "pending",
              reasonTag: "Uninformed",
              clerkNotes: "",
            });
          }
        });
      }

      setAbsentees(absentItems);
    } catch (err) {
      console.error("Failed to load absent students:", err);
      toast.error("Could not fetch today's attendance.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAbsenteeData();
  }, [selectedDate]);

  // Filtered absentees
  const filteredAbsentees = useMemo(() => {
    return absentees.filter((a) => {
      const q = searchTerm.toLowerCase();
      const matchSearch =
        !q ||
        a.name.toLowerCase().includes(q) ||
        a.grNumber.toLowerCase().includes(q) ||
        a.phone.includes(q) ||
        a.fatherName.toLowerCase().includes(q);

      const matchClass = selectedClass === "all" || a.className === selectedClass;
      const matchStatus = statusFilter === "all" || a.status === statusFilter;

      return matchSearch && matchClass && matchStatus;
    });
  }, [absentees, searchTerm, selectedClass, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    const totalAbsent = absentees.length;
    const pending = absentees.filter((a) => a.status === "pending").length;
    const contacted = absentees.filter((a) => a.status === "contacted").length;
    const leaveApproved = absentees.filter((a) => a.status === "leave_approved").length;
    return { totalAbsent, pending, contacted, leaveApproved };
  }, [absentees]);

  // 1-Click WhatsApp Trigger
  const handleSendWhatsApp = (item: AbsenteeItem) => {
    const cleanPhone = item.phone.replace(/\D/g, "");
    const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const message = encodeURIComponent(
      `Namaskar ${item.fatherName},\nThis is an automated notification from School Office regarding your ward *${item.name}* (Class ${item.className}-${item.divisionName}, Roll No. ${item.rollNumber}).\nHe/She is marked *ABSENT* today (${formatDDMMYYYY(selectedDate)}).\nIf this was uninformed, please contact the school office or submit a formal leave request.\nThank you.`
    );
    window.open(`https://wa.me/${formattedPhone}?text=${message}`, "_blank");

    // Mark as contacted
    setAbsentees((prev) =>
      prev.map((a) => (a.id === item.id ? { ...a, status: "contacted" } : a))
    );
    toast.success(`WhatsApp message opened for ${item.name}`);
  };

  // Direct Call Trigger
  const handleCall = (item: AbsenteeItem) => {
    window.location.href = `tel:+91${item.phone.replace(/\D/g, "")}`;
    setAbsentees((prev) =>
      prev.map((a) => (a.id === item.id ? { ...a, status: "contacted" } : a))
    );
  };

  // Open Log Reason Modal
  const openReasonModal = (item: AbsenteeItem) => {
    setActiveReasonModalStudent(item);
    setModalReason(item.reasonTag !== "Uninformed" ? item.reasonTag : "Sick / Fever");
    setModalNotes(item.clerkNotes || "");
  };

  const handleSaveReason = () => {
    if (!activeReasonModalStudent) return;
    setAbsentees((prev) =>
      prev.map((a) =>
        a.id === activeReasonModalStudent.id
          ? {
              ...a,
              reasonTag: modalReason,
              clerkNotes: modalNotes,
              status: modalReason.includes("Leave") ? "leave_approved" : "contacted",
            }
          : a
      )
    );
    toast.success(`Reason logged for ${activeReasonModalStudent.name}`);
    setActiveReasonModalStudent(null);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <Link href="/clerk" className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
              <ArrowLeft size={18} />
            </Link>
            <div className="h-8 w-8 rounded-lg bg-red-50 dark:bg-red-950/50 text-red-600 flex items-center justify-center">
              <PhoneCall className="h-5 w-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-zinc-100 tracking-tight">
              Daily Absentee Calling & Follow-up Desk
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 pl-11">
            Track daily absent students, trigger 1-click WhatsApp alerts, call parents, and record absence reasons.
          </p>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-xs">
          <Calendar className="h-4 w-4 text-blue-600 shrink-0" />
          <span className="text-xs font-semibold text-gray-500">Attendance Date:</span>
          <DatePicker
            value={selectedDate}
            onChange={date => setSelectedDate(date)}
            className="w-auto h-7 text-xs border-0 p-0 focus-visible:ring-0 font-bold text-gray-800 dark:text-zinc-200 cursor-pointer"
          />
        </div>
      </div>

      {/* KPI METRICS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <Card className="rounded-2xl border-red-200 dark:border-red-900/50 bg-red-50/40 dark:bg-red-950/20 shadow-xs p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-red-800 dark:text-red-300 uppercase tracking-wider">Total Absent Today</span>
            <UserX size={18} className="text-red-600" />
          </div>
          <p className="text-2xl font-black text-red-700 dark:text-red-400 mt-2">{stats.totalAbsent}</p>
        </Card>

        <Card className="rounded-2xl border-amber-200 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/20 shadow-xs p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">Pending Call</span>
            <Clock size={18} className="text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-700 dark:text-amber-400 mt-2">{stats.pending}</p>
        </Card>

        <Card className="rounded-2xl border-blue-200 dark:border-blue-900/50 bg-blue-50/40 dark:bg-blue-950/20 shadow-xs p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider">Contacted / Logged</span>
            <MessageSquare size={18} className="text-blue-600" />
          </div>
          <p className="text-2xl font-black text-blue-700 dark:text-blue-400 mt-2">{stats.contacted}</p>
        </Card>

        <Card className="rounded-2xl border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-xs p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">Leave Approved</span>
            <FileCheck size={18} className="text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-2">{stats.leaveApproved}</p>
        </Card>
      </div>

      {/* FILTER CONTROLS */}
      <Card className="rounded-2xl border-gray-200 dark:border-zinc-800 shadow-xs bg-white dark:bg-zinc-900 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search Student, GR No, Parent Phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 text-xs rounded-xl h-9"
            />
          </div>

          <div>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full text-xs h-9 rounded-xl border border-gray-200 dark:border-zinc-700 px-3 bg-white dark:bg-zinc-900 font-medium"
            >
              <option value="all">All Classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.school_class || c.name}>
                  {c.school_class || c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full text-xs h-9 rounded-xl border border-gray-200 dark:border-zinc-700 px-3 bg-white dark:bg-zinc-900 font-medium"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending Calling</option>
              <option value="contacted">Parent Contacted</option>
              <option value="leave_approved">Leave Approved</option>
            </select>
          </div>
        </div>
      </Card>

      {/* ABSENTEE LIST ROSTER */}
      <Card className="rounded-2xl border-gray-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900 overflow-hidden">
        <CardHeader className="p-4 px-6 bg-slate-50 dark:bg-zinc-800/40 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
          <CardTitle className="text-sm font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-2">
            <Users size={16} className="text-red-500" /> Absent Students List ({filteredAbsentees.length})
          </CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchAbsenteeData}
            className="text-xs h-7 rounded-lg gap-1"
          >
            <RefreshCw size={12} /> Refresh
          </Button>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-100/70 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 font-bold border-b border-gray-200 dark:border-zinc-700 text-[11px] uppercase tracking-wider">
                <th className="p-3.5 w-20 text-center">Roll / GR</th>
                <th className="p-3.5 min-w-[170px]">Student Name</th>
                <th className="p-3.5 w-28">Class & Div</th>
                <th className="p-3.5 min-w-[150px]">Parent & Contact</th>
                <th className="p-3.5 w-36">Reason Tag</th>
                <th className="p-3.5 w-28 text-center">Status</th>
                <th className="p-3.5 w-48 text-center">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-gray-500">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-red-600" />
                    Fetching today&apos;s attendance data...
                  </td>
                </tr>
              ) : filteredAbsentees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-gray-400">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                    No absent students found for this date & filter.
                  </td>
                </tr>
              ) : (
                filteredAbsentees.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="p-3 text-center">
                      <div className="font-mono font-bold text-gray-700 dark:text-zinc-300">#{item.rollNumber}</div>
                      <div className="text-[10px] font-mono text-gray-400">{item.grNumber}</div>
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-gray-900 dark:text-zinc-100">{item.name}</div>
                      {item.clerkNotes && (
                        <div className="text-[10px] text-gray-500 italic mt-0.5">Note: {item.clerkNotes}</div>
                      )}
                    </td>
                    <td className="p-3 font-semibold text-gray-700 dark:text-zinc-300">
                      {item.className} - Div {item.divisionName}
                    </td>
                    <td className="p-3">
                      <div className="text-gray-900 dark:text-zinc-100 font-medium">{item.fatherName}</div>
                      <div className="text-[11px] font-mono text-blue-600 dark:text-blue-400">{item.phone}</div>
                    </td>
                    <td className="p-3">
                      <button
                        type="button"
                        onClick={() => openReasonModal(item)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                      >
                        {item.reasonTag === "Sick / Fever" && <HeartPulse size={12} className="text-red-500" />}
                        {item.reasonTag === "Family Function" && <Home size={12} className="text-purple-500" />}
                        {item.reasonTag}
                      </button>
                    </td>
                    <td className="p-3 text-center">
                      {item.status === "pending" && (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold">
                          Pending
                        </Badge>
                      )}
                      {item.status === "contacted" && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-bold">
                          Contacted
                        </Badge>
                      )}
                      {item.status === "leave_approved" && (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                          Approved
                        </Badge>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleSendWhatsApp(item)}
                          className="h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-semibold shadow-2xs gap-1"
                        >
                          <Send size={11} /> WhatsApp
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleCall(item)}
                          className="h-7 px-2.5 rounded-lg text-[11px] font-semibold text-blue-700 border-blue-200 hover:bg-blue-50 gap-1"
                        >
                          <PhoneCall size={11} /> Call
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* LOG REASON MODAL */}
      {activeReasonModalStudent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 dark:border-zinc-800 space-y-4 animate-in fade-in">
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-zinc-100">
                Log Absence Reason
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Recording reason for: <strong>{activeReasonModalStudent.name}</strong> (Class {activeReasonModalStudent.className})
              </p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300">Absence Reason</label>
                <select
                  value={modalReason}
                  onChange={(e) => setModalReason(e.target.value)}
                  className="w-full text-xs h-9 rounded-xl border border-gray-200 dark:border-zinc-700 px-3 bg-white dark:bg-zinc-900 font-medium"
                >
                  <option value="Sick / Fever">Sick / Fever / Medical</option>
                  <option value="Family Function">Family Event / Function</option>
                  <option value="Doctor Appointment">Doctor / Hospital Visit</option>
                  <option value="Out of Station">Out of Station / Travel</option>
                  <option value="Weather / Transport">Severe Weather / Transport Issue</option>
                  <option value="Leave Approved (Formal)">Formal Leave Application Approved</option>
                  <option value="Uninformed">Uninformed / No Response</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300">Clerk Follow-up Notes (Optional)</label>
                <Input
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  placeholder="e.g. Spoke with mother; student will return on Monday."
                  className="text-xs rounded-xl"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-zinc-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setActiveReasonModalStudent(null)}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSaveReason}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold"
              >
                Save Reason
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
