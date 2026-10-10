"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  SupportTicket,
  getActiveSupportTicket,
  getSupportTickets,
  createSupportTicket,
  countWords,
  MAX_WORDS_LIMIT,
  MAX_MEDIA_BYTES,
  CreateTicketPayload,
} from "@/lib/support";
import { SupportChatBox } from "@/components/support/support-chat-box";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Headphones,
  Plus,
  Clock,
  CheckCircle2,
  Lock,
  MessageSquare,
  AlertCircle,
  Paperclip,
  X,
  RefreshCw,
  FileText,
  LifeBuoy,
  History,
  ShieldCheck,
} from "lucide-react";

interface UserSupportHubProps {
  roleTitle?: string;
}

export const UserSupportHub: React.FC<UserSupportHubProps> = ({
  roleTitle = "Staff Support",
}) => {
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [ticketHistory, setTicketHistory] = useState<SupportTicket[]>([]);
  const [selectedHistoryTicket, setSelectedHistoryTicket] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Create form state
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("GENERAL");
  const [priority, setPriority] = useState("MEDIUM");
  const [description, setDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const wordsUsed = countWords(description);
  const isWordLimitExceeded = wordsUsed > MAX_WORDS_LIMIT;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [activeRes, allTickets] = await Promise.all([
        getActiveSupportTicket(),
        getSupportTickets(),
      ]);

      setActiveTicket(activeRes.ticket);
      setTicketHistory(allTickets.filter((t) => t.status === "CLOSED"));
    } catch (err: any) {
      console.error("Error loading user support tickets:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    // Poll every 5 seconds if active ticket is open
    const interval = setInterval(() => {
      if (activeTicket && activeTicket.status !== "CLOSED") {
        getActiveSupportTicket().then((res) => {
          if (res.ticket) setActiveTicket(res.ticket);
          else {
            // If closed by Super Admin, reload full history
            loadData();
          }
        });
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [loadData, activeTicket?.status]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_MEDIA_BYTES) {
      const sizeKb = Math.round(file.size / 1024);
      toast.error("File size exceeded", {
        description: `Attached file exceeds 200 KB limit (selected: ${sizeKb} KB). Please choose a smaller file.`,
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setSelectedFile(file);
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setFilePreviewUrl(url);
    } else {
      setFilePreviewUrl(null);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
      setFilePreviewUrl(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) {
      toast.error("Please enter a subject.");
      return;
    }
    if (!description.trim()) {
      toast.error("Please describe your issue.");
      return;
    }
    if (isWordLimitExceeded) {
      toast.error("Word limit exceeded", {
        description: `Description cannot exceed 200 words (${wordsUsed} words entered).`,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreateTicketPayload = {
        subject: subject.trim(),
        description: description.trim(),
        category,
        priority,
        media_file: selectedFile,
      };

      const newTicket = await createSupportTicket(payload);
      setActiveTicket(newTicket);
      setShowCreateModal(false);
      // Reset form
      setSubject("");
      setDescription("");
      setCategory("GENERAL");
      setPriority("MEDIUM");
      handleRemoveFile();

      toast.success("Support Ticket Raised", {
        description: `Ticket #${newTicket.ticket_number} sent to Super Admin. Live chat will open once accepted.`,
      });
    } catch (err: any) {
      toast.error("Could not raise ticket", {
        description: err?.message || "An error occurred.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleActiveTicketUpdated = (updated: SupportTicket) => {
    if (updated.status === "CLOSED") {
      setActiveTicket(null);
      loadData();
    } else {
      setActiveTicket(updated);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ─── Top Banner ──────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#5826df] via-[#6d3df5] to-[#7f4efb] text-white p-6 md:p-7 shadow-lg shadow-purple-500/10">
        <div className="absolute right-0 top-0 -mt-8 -mr-8 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold text-purple-100 mb-3 border border-white/20">
              <Headphones className="w-3.5 h-3.5 text-emerald-300" />
              {roleTitle} • Super Admin Helpdesk
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Support & Live Chat
            </h1>
            <p className="text-purple-100 text-xs md:text-sm mt-1 max-w-2xl font-normal leading-relaxed">
              Raise a support ticket to communicate directly with Super Admin. Exchange messages and documents in real time until your issue is resolved.
            </p>
          </div>

          <div>
            {activeTicket ? (
              <div className="bg-white/15 backdrop-blur-md border border-white/30 rounded-xl p-3 text-xs text-purple-100 max-w-xs">
                <div className="flex items-center gap-1.5 font-bold text-white mb-0.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-300" />
                  Active Ticket In Progress
                </div>
                <p className="text-[11px] opacity-90">
                  Ticket #{activeTicket.ticket_number}. You can raise a new ticket once this one is closed.
                </p>
              </div>
            ) : (
              <Button
                onClick={() => setShowCreateModal(true)}
                className="bg-white hover:bg-purple-50 text-[#5826df] font-bold text-xs md:text-sm shadow-md h-10 px-5 rounded-xl"
              >
                <Plus className="w-4 h-4 mr-1.5 text-[#5826df]" />
                Raise Support Ticket
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ─── Active Ticket Live Chat Section ────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center h-64 bg-white rounded-2xl border border-slate-200">
          <RefreshCw className="w-8 h-8 animate-spin text-[#5826df]" />
        </div>
      ) : activeTicket ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#5826df]" /> Active Support Chat
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              className="text-xs text-slate-600 h-8"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Sync Status
            </Button>
          </div>

          <div className="h-[620px]">
            <SupportChatBox
              ticket={activeTicket}
              isSuperAdmin={false}
              onTicketUpdated={handleActiveTicketUpdated}
              className="h-full"
            />
          </div>
        </div>
      ) : (
        /* No Active Ticket Card */
        <div className="bg-white rounded-2xl border border-dashed border-purple-200 p-8 md:p-12 text-center space-y-4 shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-purple-50 text-[#5826df] mx-auto flex items-center justify-center">
            <LifeBuoy className="w-8 h-8 text-[#5826df]" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-lg font-bold text-slate-900">No Active Support Tickets</h3>
            <p className="text-xs text-slate-500 mt-1">
              Have an issue with fees, student data, inventory, or platform access? Raise a ticket and chat with Super Admin in real time.
            </p>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-[#5826df] hover:bg-[#4a1ec4] text-white font-bold text-xs md:text-sm h-10 px-6 rounded-xl shadow-sm"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Raise Support Ticket Now
          </Button>
        </div>
      )}

      {/* ─── Past Resolved Tickets History ──────────────────────────── */}
      {ticketHistory.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <History className="w-4 h-4 text-slate-500" /> Resolved Support Tickets History ({ticketHistory.length})
            </h3>
            <span className="text-xs text-slate-400">Click to view archived chat</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {ticketHistory.map((ticket) => (
              <div
                key={ticket.id}
                onClick={() => setSelectedHistoryTicket(ticket)}
                className="p-4 rounded-xl border border-slate-200 hover:border-purple-200 hover:bg-purple-50/30 transition-all cursor-pointer space-y-2 bg-white"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-bold text-purple-700">
                    #{ticket.ticket_number}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                    Closed
                  </span>
                </div>
                <h4 className="font-bold text-xs text-slate-900 line-clamp-1">{ticket.subject}</h4>
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                  <span>{ticket.category_display}</span>
                  <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Archived Ticket View Modal ──────────────────────────────── */}
      {selectedHistoryTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full h-[640px] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <SupportChatBox
              ticket={selectedHistoryTicket}
              isSuperAdmin={false}
              onCloseChat={() => setSelectedHistoryTicket(null)}
              className="h-full border-none rounded-none"
            />
          </div>
        </div>
      )}

      {/* ─── Raise Ticket Modal ─────────────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-[#5826df] flex items-center justify-center font-bold">
                  <LifeBuoy className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Raise Support Ticket</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCreateModal(false)}
                className="h-7 w-7 p-0 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-3.5">
              {/* Subject */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Subject *</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="E.g. Issue generating fee receipts for Class 10"
                  className="w-full h-9 rounded-xl border border-slate-200 px-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#5826df]/20"
                />
              </div>

              {/* Category & Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full h-9 rounded-xl border border-slate-200 px-3 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#5826df]/20"
                  >
                    <option value="GENERAL">General Inquiry</option>
                    <option value="TECHNICAL">Technical Issue / Bug</option>
                    <option value="FEES">Fees & Finance</option>
                    <option value="INVENTORY">Inventory & Assets</option>
                    <option value="ACADEMIC">Academic & Exams</option>
                    <option value="ACCOUNT">Account & Access</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full h-9 rounded-xl border border-slate-200 px-3 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#5826df]/20"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              {/* Description (200 words limit) */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">Description *</label>
                  <span
                    className={`text-[11px] font-mono font-semibold ${
                      isWordLimitExceeded
                        ? "text-rose-600"
                        : wordsUsed >= 180
                        ? "text-amber-600"
                        : "text-slate-400"
                    }`}
                  >
                    {wordsUsed} / {MAX_WORDS_LIMIT} words
                  </span>
                </div>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide details about the issue..."
                  className={`w-full rounded-xl border p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 resize-none ${
                    isWordLimitExceeded
                      ? "border-rose-300 focus:ring-rose-400 bg-rose-50/30"
                      : "border-slate-200 focus:ring-[#5826df]/20"
                  }`}
                />
              </div>

              {/* Media File Attachment */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Optional Attachment
                </label>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.txt"
                />

                {selectedFile ? (
                  <div className="flex items-center justify-between p-2 rounded-xl bg-purple-50 border border-purple-200 text-xs">
                    <div className="flex items-center gap-2 truncate">
                      {filePreviewUrl ? (
                        <img
                          src={filePreviewUrl}
                          alt="Preview"
                          className="w-7 h-7 rounded object-cover border border-purple-300"
                        />
                      ) : (
                        <FileText className="w-4 h-4 text-purple-600 shrink-0" />
                      )}
                      <span className="font-semibold truncate">{selectedFile.name}</span>
                      <span className="text-[11px] text-purple-600 font-mono shrink-0">
                        ({Math.round(selectedFile.size / 1024)} KB)
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveFile}
                      className="h-6 w-6 p-0 text-purple-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-9 text-xs text-slate-600 border-dashed border-slate-300 hover:border-purple-300 hover:bg-purple-50/50"
                  >
                    <Paperclip className="w-3.5 h-3.5 mr-1.5 text-purple-600" />
                    Choose screenshot or document
                  </Button>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateModal(false)}
                  disabled={isSubmitting}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting || isWordLimitExceeded}
                  className="text-xs bg-[#5826df] hover:bg-[#4a1ec4] font-semibold text-white px-4"
                >
                  {isSubmitting ? "Submitting..." : "Submit Ticket to Super Admin"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
