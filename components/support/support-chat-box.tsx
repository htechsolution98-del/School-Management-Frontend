"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  SupportTicket,
  TicketMessage,
  getTicketMessages,
  sendTicketMessage,
  acceptSupportTicket,
  closeSupportTicket,
  countWords,
  MAX_WORDS_LIMIT,
  MAX_MEDIA_BYTES,
} from "@/lib/support";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Send,
  Paperclip,
  X,
  CheckCircle2,
  Clock,
  Lock,
  RefreshCw,
  FileText,
  Image as ImageIcon,
  Download,
  AlertCircle,
  ShieldAlert,
  User,
  School,
  Tag,
  Flag,
  MessageSquare,
  Sparkles,
  ZoomIn,
} from "lucide-react";

interface SupportChatBoxProps {
  ticket: SupportTicket;
  isSuperAdmin?: boolean;
  onTicketUpdated?: (updatedTicket: SupportTicket) => void;
  onCloseChat?: () => void;
  className?: string;
}

export const SupportChatBox: React.FC<SupportChatBoxProps> = ({
  ticket,
  isSuperAdmin = false,
  onTicketUpdated,
  onCloseChat,
  className = "",
}) => {
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closingNotes, setClosingNotes] = useState("");
  const [currentTicket, setCurrentTicket] = useState<SupportTicket>(ticket);
  const [previewImage, setPreviewImage] = useState<{
    url: string;
    name: string;
    size?: number;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCurrentTicket(ticket);
  }, [ticket]);

  const wordsUsed = countWords(textInput);
  const isWordLimitExceeded = wordsUsed > MAX_WORDS_LIMIT;

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "auto",
    });
  };

  const loadMessages = useCallback(
    async (showLoading = false) => {
      if (showLoading) setLoading(true);
      try {
        const data = await getTicketMessages(currentTicket.id);
        setMessages(data.messages || []);
        if (showLoading) {
          setTimeout(() => scrollToBottom(false), 100);
        }
      } catch (err: any) {
        console.error("Error fetching ticket messages:", err);
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [currentTicket.id]
  );

  useEffect(() => {
    loadMessages(true);
    // Poll every 3 seconds for active chat sessions
    const interval = setInterval(() => {
      if (currentTicket.status !== "CLOSED") {
        loadMessages(false);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [loadMessages, currentTicket.status]);

  // Scroll on new message count change
  useEffect(() => {
    scrollToBottom(true);
  }, [messages.length]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Strict 200 KB size validation
    if (file.size > MAX_MEDIA_BYTES) {
      const sizeKb = Math.round(file.size / 1024);
      toast.error("File size exceeded", {
        description: `Attached file exceeds 200 KB limit (selected: ${sizeKb} KB). Please upload a smaller file.`,
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
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (currentTicket.status === "CLOSED") {
      toast.error("This ticket is closed.");
      return;
    }

    if (!textInput.trim() && !selectedFile) {
      toast.error("Please enter a message or attach a file.");
      return;
    }

    if (isWordLimitExceeded) {
      toast.error("Word limit exceeded", {
        description: `Message text cannot exceed 200 words (${wordsUsed} words entered).`,
      });
      return;
    }

    setSending(true);
    try {
      const formData = new FormData();
      if (textInput.trim()) {
        formData.append("text_content", textInput.trim());
      }
      if (selectedFile) {
        formData.append("media_file", selectedFile);
      }

      const newMsg = await sendTicketMessage(currentTicket.id, formData);
      setMessages((prev) => [...prev, newMsg]);
      setTextInput("");
      handleRemoveFile();
      scrollToBottom(true);
    } catch (err: any) {
      toast.error("Failed to send message", {
        description: err?.message || "An unexpected error occurred.",
      });
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      const updated = await acceptSupportTicket(currentTicket.id);
      setCurrentTicket(updated);
      onTicketUpdated?.(updated);
      toast.success("Ticket Accepted", {
        description: `Live chat is now active for ticket #${updated.ticket_number}.`,
      });
      await loadMessages(false);
    } catch (err: any) {
      toast.error("Error accepting ticket", { description: err.message });
    } finally {
      setIsAccepting(false);
    }
  };

  const handleCloseTicket = async () => {
    setIsClosing(true);
    try {
      const updated = await closeSupportTicket(currentTicket.id, closingNotes);
      setCurrentTicket(updated);
      onTicketUpdated?.(updated);
      setShowCloseModal(false);
      toast.success("Ticket Closed", {
        description: `Ticket #${updated.ticket_number} has been resolved and closed.`,
      });
      await loadMessages(false);
    } catch (err: any) {
      toast.error("Error closing ticket", { description: err.message });
    } finally {
      setIsClosing(false);
    }
  };

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return "bg-rose-100 text-rose-800 border-rose-200";
      case "HIGH":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "MEDIUM":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getStatusBadge = () => {
    if (currentTicket.status === "PENDING") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
          <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin" />
          Pending Super Admin Acceptance
        </span>
      );
    }
    if (currentTicket.status === "IN_PROGRESS") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Live Chat Active
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
        <Lock className="w-3.5 h-3.5 text-slate-500" />
        Ticket Closed
      </span>
    );
  };

  const formatMsgTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
    } catch {
      return "";
    }
  };

  return (
    <div
      className={`flex flex-col h-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden ${className}`}
    >
      {/* ─── Chat Header ─────────────────────────────────────────────── */}
      <div className="p-4 md:p-5 border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-purple-50/40">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-md border border-purple-200">
                #{currentTicket.ticket_number}
              </span>
              {getStatusBadge()}
              <span
                className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${getPriorityBadgeClass(
                  currentTicket.priority
                )}`}
              >
                {currentTicket.priority_display || currentTicket.priority} Priority
              </span>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                {currentTicket.category_display || currentTicket.category}
              </span>
            </div>

            <h2 className="text-base md:text-lg font-bold text-slate-900 leading-snug">
              {currentTicket.subject}
            </h2>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-0.5">
              <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                <User className="w-3.5 h-3.5 text-purple-600" />
                {currentTicket.creator_display_name || currentTicket.requester_name} (
                <span className="font-semibold text-purple-700">{currentTicket.requester_role}</span>)
              </span>
              <span className="inline-flex items-center gap-1">
                <School className="w-3.5 h-3.5 text-slate-400" />
                {currentTicket.school_name || "Enterprise"}
              </span>
            </div>
          </div>

          {/* Action Buttons in Header */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadMessages(false)}
              className="h-8 px-2.5 text-xs text-slate-600 border-slate-200 hover:bg-slate-100"
              title="Refresh messages"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>

            {isSuperAdmin && currentTicket.status === "PENDING" && (
              <Button
                size="sm"
                onClick={handleAccept}
                disabled={isAccepting}
                className="h-8 px-3.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                {isAccepting ? "Accepting..." : "Accept Ticket & Open Chat"}
              </Button>
            )}

            {isSuperAdmin && currentTicket.status === "IN_PROGRESS" && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setShowCloseModal(true)}
                className="h-8 px-3.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white hover:text-white border-transparent shadow-xs"
              >
                <Lock className="w-3.5 h-3.5 mr-1.5" />
                Close Ticket
              </Button>
            )}

            {onCloseChat && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onCloseChat}
                className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700"
                title="Close chat panel"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ─── Messages Scroll Area ────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4 bg-slate-50/50">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400 space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin text-purple-600" />
            <p className="text-xs font-medium">Loading ticket messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center p-6 text-slate-400">
            <MessageSquare className="w-10 h-10 text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-600">No messages yet</p>
            <p className="text-xs mt-1">Start the conversation below.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isSystem = msg.message_type === "SYSTEM";
            const isSuperAdminSender = msg.is_super_admin_sender;
            const timeStr = formatMsgTime(msg.created_at);

            if (isSystem) {
              return (
                <div key={msg.id} className="flex justify-center my-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100/70 border border-purple-200 text-purple-800 text-[11px] font-medium text-center max-w-lg">
                    <Sparkles className="w-3 h-3 text-purple-600 shrink-0" />
                    <span>{msg.text_content}</span>
                    <span className="text-[10px] text-purple-500 font-mono">({timeStr})</span>
                  </div>
                </div>
              );
            }

            const isMyMessage = isSuperAdmin ? Boolean(msg.is_super_admin_sender) : !Boolean(msg.is_super_admin_sender);

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  isMyMessage ? "items-end" : "items-start"
                }`}
              >
                {/* Sender Header */}
                <div
                  className={`flex items-center gap-1.5 text-[11px] font-medium text-slate-500 mb-1 px-1 ${
                    isMyMessage ? "flex-row-reverse" : ""
                  }`}
                >
                  <span className="font-semibold text-slate-800">
                    {isMyMessage ? "You" : (msg.sender_display_name || msg.sender_name)}
                  </span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                      isMyMessage
                        ? "bg-purple-100 text-purple-800"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {msg.sender_role}
                  </span>
                </div>

                {/* Bubble Container */}
                <div
                  className={`max-w-md md:max-w-lg rounded-2xl p-3 shadow-xs text-xs md:text-sm leading-relaxed ${
                    isMyMessage
                      ? "bg-gradient-to-r from-[#5826df] to-[#7f4efb] text-white rounded-tr-xs"
                      : "bg-white text-slate-800 border border-slate-200 rounded-tl-xs"
                  }`}
                >
                  {/* Media Content (Top) */}
                  {msg.media_file && (
                    <div className={msg.text_content ? "mb-2" : ""}>
                      {msg.media_content_type?.startsWith("image/") ? (
                        <div className="space-y-1.5">
                          <div
                            onClick={() =>
                              setPreviewImage({
                                url: msg.media_url || msg.media_file || "",
                                name: msg.media_name || "Image Attachment",
                                size: msg.media_size_bytes,
                              })
                            }
                            className="group relative cursor-pointer overflow-hidden rounded-lg border border-black/10 bg-black/5 transition-transform hover:scale-[1.01]"
                            title="Click to view full size image"
                          >
                            <img
                              src={msg.media_url || msg.media_file || ""}
                              alt={msg.media_name || "Attachment"}
                              className="rounded-lg max-h-48 w-auto object-cover transition-opacity group-hover:opacity-90"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
                              <div className="rounded-full bg-black/60 p-2 text-white shadow-md backdrop-blur-xs flex items-center gap-1 text-[11px] font-semibold">
                                <ZoomIn className="h-4 w-4" />
                                <span>Preview</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-[10px] opacity-85">
                            <span className="truncate max-w-[180px] font-mono">
                              {msg.media_name}
                            </span>
                            <span>{Math.round(msg.media_size_bytes / 1024)} KB</span>
                          </div>
                        </div>
                      ) : (
                        <a
                          href={msg.media_url || msg.media_file}
                          target="_blank"
                          rel="noreferrer"
                          download={msg.media_name || "attachment"}
                          className={`inline-flex items-center gap-2 p-2 rounded-lg border text-xs transition-colors ${
                            isMyMessage
                              ? "bg-white/10 hover:bg-white/20 border-white/20 text-white"
                              : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                          }`}
                        >
                          <FileText className="w-4 h-4 text-purple-300 shrink-0" />
                          <div className="text-left">
                            <p className="font-semibold truncate max-w-[180px]">
                              {msg.media_name || "Download Attachment"}
                            </p>
                            <p className="text-[10px] opacity-75">
                              {Math.round(msg.media_size_bytes / 1024)} KB • Click to download
                            </p>
                          </div>
                          <Download className="w-3.5 h-3.5 ml-1 opacity-75" />
                        </a>
                      )}
                    </div>
                  )}

                  {/* Text Content (Bottom of Media) */}
                  {msg.text_content && (
                    <p
                      className={`whitespace-pre-wrap break-words ${
                        msg.media_file
                          ? isMyMessage
                            ? "pt-1.5 border-t border-white/20"
                            : "pt-1.5 border-t border-slate-200"
                          : ""
                      }`}
                    >
                      {msg.text_content}
                    </p>
                  )}

                  {/* WhatsApp-style bottom timestamp */}
                  <div
                    className={`flex items-center justify-end gap-1 mt-1 -mb-0.5 text-[10px] font-medium select-none ${
                      isMyMessage ? "text-purple-200/85" : "text-slate-400"
                    }`}
                  >
                    <span>{timeStr}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ─── Chat Input Area / Status Banner ─────────────────────────── */}
      <div className="p-3 md:p-4 bg-white border-t border-slate-200">
        {currentTicket.status === "CLOSED" ? (
          <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-200 text-center space-y-1">
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-700">
              <Lock className="w-4 h-4 text-slate-500" />
              This support ticket is closed and archived.
            </div>
            {currentTicket.closing_notes && (
              <p className="text-xs text-slate-500">
                Resolution notes: <span className="font-medium text-slate-700">{currentTicket.closing_notes}</span>
              </p>
            )}
            <p className="text-[11px] text-slate-400">
              Closed by {currentTicket.closed_by_name || "Super Admin"} on{" "}
              {currentTicket.closed_at ? new Date(currentTicket.closed_at).toLocaleDateString() : ""}
            </p>
          </div>
        ) : currentTicket.status === "PENDING" && !isSuperAdmin ? (
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-center space-y-1">
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-amber-800">
              <Clock className="w-4 h-4 text-amber-600 animate-spin" />
              Ticket submitted. Waiting for Super Admin to accept.
            </div>
            <p className="text-[11px] text-amber-700">
              Super Admin has been notified. As soon as they accept your ticket, live chat will open here.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSendMessage} className="space-y-2">
            {/* File Attachment Pill Preview */}
            {selectedFile && (
              <div className="flex items-center justify-between p-2 rounded-lg bg-purple-50 border border-purple-200 text-xs text-purple-900">
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
                    ({Math.round(selectedFile.size / 1024)} KB / 200 KB)
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveFile}
                  className="h-6 w-6 p-0 text-purple-600 hover:text-purple-900"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}

            <div className="relative">
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message here... Press Enter to send"
                rows={2}
                className={`w-full rounded-xl border p-3 pr-24 text-xs md:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 resize-none transition-all ${
                  isWordLimitExceeded
                    ? "border-rose-300 focus:ring-rose-400 bg-rose-50/30"
                    : "border-slate-200 focus:border-[#5826df] focus:ring-[#5826df]/20"
                }`}
              />

              {/* Action Buttons inside Input */}
              <div className="absolute right-2.5 bottom-3 flex items-center gap-1.5">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.txt"
                />

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-8 w-8 p-0 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg"
                  title="Attach media"
                >
                  <Paperclip className="w-4 h-4" />
                </Button>

                <Button
                  type="submit"
                  size="sm"
                  disabled={
                    sending ||
                    (!textInput.trim() && !selectedFile) ||
                    isWordLimitExceeded
                  }
                  className="h-8 px-3 rounded-lg bg-[#5826df] hover:bg-[#4a1ec4] text-white font-semibold text-xs shadow-xs"
                >
                  {sending ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5 mr-1" /> Send
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Word Counter */}
            {wordsUsed > 0 && (
              <div className="flex items-center justify-end text-[11px] px-1">
                <span
                  className={`font-semibold font-mono ${
                    isWordLimitExceeded
                      ? "text-rose-600 font-bold"
                      : wordsUsed >= 180
                      ? "text-amber-600"
                      : "text-slate-400"
                  }`}
                >
                  {wordsUsed} / {MAX_WORDS_LIMIT} words
                </span>
              </div>
            )}
          </form>
        )}
      </div>

      {/* ─── Close Ticket Modal (Super Admin) ────────────────────────── */}
      {showCloseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Close Support Ticket?</h3>
                <p className="text-xs text-slate-500">
                  Ticket #{currentTicket.ticket_number} • {currentTicket.creator_display_name}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Closing this ticket will end the live chat and archive the conversation. The requester will then be permitted to raise a new support ticket if needed.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Resolution Notes (Optional):
              </label>
              <textarea
                value={closingNotes}
                onChange={(e) => setClosingNotes(e.target.value)}
                placeholder="E.g. Issue resolved on server; credentials updated."
                rows={3}
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#5826df]/20"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCloseModal(false)}
                disabled={isClosing}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleCloseTicket}
                disabled={isClosing}
                className="text-xs bg-rose-600 hover:bg-rose-700 text-white hover:text-white font-semibold border-transparent shadow-xs"
              >
                {isClosing ? "Closing..." : "Confirm & Close Ticket"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Big Image Preview Modal ───────────────────────────────── */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] w-full flex flex-col items-center justify-center space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Toolbar */}
            <div className="w-full flex items-center justify-between px-4 py-2.5 bg-black/70 rounded-xl text-white backdrop-blur-md border border-white/15 shadow-xl">
              <div className="flex items-center gap-2 truncate">
                <ImageIcon className="w-4 h-4 text-purple-400 shrink-0" />
                <span className="font-semibold text-xs md:text-sm truncate max-w-xs md:max-w-md">
                  {previewImage.name}
                </span>
                {previewImage.size ? (
                  <span className="text-[11px] text-slate-300 font-mono">
                    ({Math.round(previewImage.size / 1024)} KB)
                  </span>
                ) : null}
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={previewImage.url}
                  download={previewImage.name}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-xs font-semibold text-white border border-white/20 transition-colors shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </a>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPreviewImage(null)}
                  className="h-8 w-8 p-0 text-white/80 hover:text-white hover:bg-white/20 rounded-lg"
                  title="Close preview (Esc)"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Image Box */}
            <div className="relative max-h-[78vh] max-w-full overflow-hidden rounded-2xl border border-white/10 shadow-2xl bg-black/50 flex items-center justify-center p-1">
              <img
                src={previewImage.url}
                alt={previewImage.name}
                className="max-h-[75vh] max-w-[88vw] object-contain rounded-xl select-none"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
