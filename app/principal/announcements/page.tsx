"use client";

import React, { useState, useEffect } from "react";
import {
  Megaphone, Plus, Trash2, Loader2, X, AlertCircle, Calendar, Users, Bell, Edit2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  type AnnouncementResponse,
  type AnnouncementPayload
} from "@/lib/principal";

// ─── AUDIENCE LABELS ──────────────────────────────────────────────────────────
const AUDIENCE_OPTIONS = [
  { value: "ALL", label: "All Users" },
  { value: "TEACHER", label: "Teachers Only" },
  { value: "STUDENT", label: "Students Only" },
  { value: "PARENT", label: "Parents Only" },
];

function getAudienceLabel(val: string) {
  return AUDIENCE_OPTIONS.find((o) => o.value === val)?.label ?? val;
}

function getAnnouncementId(ann: any): any {
  return ann?.id ?? ann?._id ?? ann?.Id ?? ann?.ID;
}

// ─── STAT CARD ────────────────────────────────────────────────────────────────
function StatCard({
  icon, iconBg, iconColor, label, value, sub
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  label: string;
  value: React.ReactNode;
  sub?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-150 shadow-sm p-5 flex items-center gap-4 flex-1 min-w-0">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        <span className={iconColor}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">{label}</p>
        <p className="text-2xl font-black text-gray-900 leading-tight">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── ANNOUNCEMENT MODAL ──────────────────────────────────────────────────────────
function AnnouncementModal({
  onClose,
  onSaved,
  announcement,
}: {
  onClose: () => void;
  onSaved: () => void;
  announcement?: AnnouncementResponse;
}) {
  const isEdit = !!announcement;
  const [title, setTitle] = useState(announcement?.title ?? "");
  const [description, setDescription] = useState(announcement?.description ?? "");
  const [announcementFor, setAnnouncementFor] = useState(announcement?.announcement_for ?? "ALL");
  const [isEveryone, setIsEveryone] = useState(String(announcement?.is_everyone ?? "false"));
  
  const formatForInput = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
      return "";
    }
  };

  const [expiresAt, setExpiresAt] = useState(announcement?.expires_at ? formatForInput(announcement.expires_at) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!title.trim() || !description.trim()) {
      setError("Title and Description are required.");
      return;
    }
    setSaving(true);
    setError(null);

    try {
      const payload: AnnouncementPayload = {
        title: title.trim(),
        description: description.trim(),
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      };

      if (isEveryone === "true") {
        payload.is_everyone = "true";
      } else {
        payload.announcement_for = announcementFor;
      }

      if (isEdit && announcement) {
        await updateAnnouncement(Number(getAnnouncementId(announcement)), payload);
        toast.success("Announcement updated successfully!");
      } else {
        await createAnnouncement(payload);
        toast.success("Announcement published successfully!");
      }

      onSaved();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save announcement.");
    } finally {
      setSaving(false);
    }
  };

  const handleAudienceChange = (val: string) => {
    setAnnouncementFor(val);
    if (val === "ALL") {
      setIsEveryone("true");
    } else {
      setIsEveryone("false");
    }
  };

  const handleEveryoneChange = (val: string) => {
    setIsEveryone(val);
    if (val === "true") {
      setAnnouncementFor("ALL");
    } else {
      if (announcementFor === "ALL") {
        setAnnouncementFor("TEACHER");
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-5 sm:p-6 max-h-[90vh] overflow-y-auto z-10"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-indigo-600" />
            {isEdit ? "Edit Announcement" : "Create Announcement"}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold px-3 py-2.5 rounded-xl mb-4">
            <AlertCircle size={14} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Teacher meeting / Holiday Announcement"
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">
              Description <span className="text-red-400">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide detail for this announcement..."
              rows={4}
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">
                Audience Target
              </label>
              <select
                value={announcementFor}
                onChange={(e) => handleAudienceChange(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all"
              >
                {AUDIENCE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">
                Send to Everyone?
              </label>
              <select
                value={isEveryone}
                onChange={(e) => handleEveryoneChange(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all"
              >
                <option value="true">Yes, Broadcast to All</option>
                <option value="false">No, Target Audience Only</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">
              Expires At (Optional)
            </label>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all bg-white"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-indigo-100"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            {saving ? (isEdit ? "Saving…" : "Publishing…") : (isEdit ? "Save Changes" : "Publish")}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<AnnouncementResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<AnnouncementResponse | undefined>(undefined);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleNewClick = () => {
    setSelectedAnnouncement(undefined);
    setShowModal(true);
  };

  const handleEditClick = (ann: AnnouncementResponse) => {
    setSelectedAnnouncement(ann);
    setShowModal(true);
  };

  const handleDeleteClick = (id: number) => {
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (deleteId === null) return;
    setDeleting(true);
    try {
      await deleteAnnouncement(deleteId);
      toast.success("Announcement deleted successfully!");
      setDeleteId(null);
      loadData();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to delete announcement.");
    } finally {
      setDeleting(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAnnouncements();
      // Sort: newest first
      const sorted = [...data].sort((a, b) => {
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      });
      setAnnouncements(sorted);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load announcements.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute stat values
  const totalCount = announcements.length;
  const teacherCount = announcements.filter(a => a.announcement_for === "TEACHER").length;
  const broadcastCount = announcements.filter(a => String(a.is_everyone) === "true" || !a.announcement_for).length;

  return (
    <div className="min-h-screen bg-[#f8fafc] p-3 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-indigo-600" />
            School Announcements
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Send circulars, notifications, and instant alerts to targeted school roles.
          </p>
        </div>
        <button
          onClick={handleNewClick}
          className="flex items-center justify-center gap-2 px-5 py-2.5 w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-100"
        >
          <Plus size={16} /> New Announcement
        </button>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          icon={<Megaphone size={20} />}
          iconBg="bg-indigo-50"
          iconColor="text-indigo-600"
          label="Total Published"
          value={loading ? "..." : totalCount}
          sub="All-time announcements"
        />
        <StatCard
          icon={<Users size={20} />}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          label="Teachers Targeted"
          value={loading ? "..." : teacherCount}
          sub="Exclusive teacher notices"
        />
        <StatCard
          icon={<Bell size={20} />}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          label="Global Broadcasts"
          value={loading ? "..." : broadcastCount}
          sub="Sent to all users"
        />
      </div>

      {/* Feed Table */}
      <div className="bg-white rounded-2xl border border-gray-150 shadow-sm mb-6 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-indigo-600" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-red-500 px-4">
            <AlertCircle size={24} />
            <p className="font-semibold text-center">{error}</p>
            <button
              onClick={loadData}
              className="mt-2 text-xs font-bold text-indigo-600 hover:underline"
            >
              Try Reloading
            </button>
          </div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Megaphone size={42} className="mx-auto mb-3 opacity-30 text-indigo-400 animate-pulse" />
            <p className="font-semibold text-gray-700">No announcements yet</p>
            <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
              Get started by creating your very first school announcement notice.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-slate-50/50">
                  <th className="text-xs font-bold text-gray-400 uppercase tracking-wide px-6 py-4">Title</th>
                  <th className="text-xs font-bold text-gray-400 uppercase tracking-wide px-6 py-4">Description</th>
                  <th className="text-xs font-bold text-gray-400 uppercase tracking-wide px-6 py-4">Target Audience</th>
                  <th className="text-xs font-bold text-gray-400 uppercase tracking-wide px-6 py-4">Broadcast</th>
                  <th className="text-xs font-bold text-gray-400 uppercase tracking-wide px-6 py-4">Created Date</th>
                  <th className="text-xs font-bold text-gray-400 uppercase tracking-wide px-6 py-4">Expires Date</th>
                  <th className="text-xs font-bold text-gray-400 uppercase tracking-wide px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {announcements.map((ann, index) => {
                  const dateStr = ann.created_at
                    ? new Date(ann.created_at).toLocaleString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                    : "—";

                  const expiresStr = ann.expires_at
                    ? new Date(ann.expires_at).toLocaleString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                    : "Never";

                  const isEveryoneStr = String(ann.is_everyone) === "true";
                  const isExpired = ann.expires_at ? new Date(ann.expires_at).getTime() < Date.now() : false;
                  const annId = getAnnouncementId(ann);

                  return (
                    <tr key={annId ? `ann-${annId}-${index}` : `idx-${index}`} className="hover:bg-slate-50/40 transition-colors">
                      <td className="px-6 py-4 text-sm font-bold text-gray-800 max-w-[200px] truncate">
                        {ann.title}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-[300px] truncate" title={ann.description}>
                        {ann.description}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full ${ann.announcement_for === "TEACHER"
                            ? "bg-amber-50 text-amber-700 border border-amber-100"
                            : ann.announcement_for === "STUDENT"
                              ? "bg-blue-50 text-blue-700 border border-blue-100"
                              : ann.announcement_for === "PARENT"
                                ? "bg-purple-50 text-purple-700 border border-purple-100"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                          }`}>
                          {ann.announcement_for ? getAudienceLabel(ann.announcement_for) : "All Users (Broadcast)"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {isEveryoneStr ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Yes
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-250 px-2.5 py-1 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> No
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-gray-400">
                        <span className="flex items-center gap-1.5">
                          <Calendar size={13} className="text-gray-300" />
                          {dateStr}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-gray-400">
                        <span className={`flex items-center gap-1.5 ${isExpired ? "text-red-650 font-bold" : ""}`}>
                          <Calendar size={13} className={isExpired ? "text-red-400" : "text-gray-300"} />
                          {expiresStr} {isExpired && "(Expired)"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleEditClick(ann)}
                            className="p-1.5 hover:bg-indigo-50 text-indigo-600 hover:text-indigo-700 rounded-lg transition-colors inline-flex items-center"
                            title="Edit Announcement"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(annId)}
                            className="p-1.5 hover:bg-red-50 text-red-600 hover:text-red-700 rounded-lg transition-colors inline-flex items-center"
                            title="Delete Announcement"
                          >
                            <Trash2 size={13} />
                          </button>
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

      {/* Modal Overlay */}
      <AnimatePresence>
        {showModal && (
          <AnnouncementModal
            announcement={selectedAnnouncement}
            onClose={() => {
              setShowModal(false);
              setSelectedAnnouncement(undefined);
            }}
            onSaved={loadData}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteId !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 z-10 text-center"
            >
              <div className="mx-auto w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-600 mb-4">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Delete Announcement?</h3>
              <p className="text-sm text-gray-400 mb-6">
                Are you sure you want to delete this announcement? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteId(null)}
                  disabled={deleting}
                  className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deleting}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-red-100 flex items-center justify-center gap-2"
                >
                  {deleting ? <Loader2 size={14} className="animate-spin" /> : null}
                  {deleting ? "Deleting…" : "Delete"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
