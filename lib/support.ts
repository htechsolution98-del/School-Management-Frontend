import { fetchWithAuth } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";

export interface TicketMessage {
  id: number;
  ticket: number;
  sender: number | null;
  sender_name: string;
  sender_display_name: string;
  sender_role: string;
  is_super_admin_sender: boolean;
  message_type: "TEXT" | "MEDIA" | "SYSTEM";
  text_content: string | null;
  media_file: string | null;
  media_url: string | null;
  media_name: string | null;
  media_size_bytes: number;
  media_content_type: string | null;
  created_at: string;
}

export interface SupportTicket {
  id: number;
  ticket_number: string;
  school: number | null;
  school_name: string;
  created_by: number;
  creator_display_name: string;
  requester_role: string;
  requester_name: string;
  subject: string;
  description: string;
  category: "GENERAL" | "TECHNICAL" | "FEES" | "INVENTORY" | "ACADEMIC" | "ACCOUNT";
  category_display: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  priority_display: string;
  status: "PENDING" | "IN_PROGRESS" | "CLOSED";
  status_display: string;
  accepted_by: number | null;
  accepted_by_name: string | null;
  accepted_at: string | null;
  closed_by: number | null;
  closed_by_name: string | null;
  closed_at: string | null;
  closing_notes: string | null;
  unread_messages_count: number;
  last_message: {
    id: number;
    sender_name: string;
    message_type: string;
    text_content: string;
    created_at: string;
  } | null;
  created_at: string;
  updated_at: string;
}

export interface SupportTicketStats {
  total_count: number;
  pending_count: number;
  in_progress_count: number;
  closed_count: number;
  is_super_admin: boolean;
  schools: { id: number; name: string; slug?: string }[];
}

export interface SupportTicketFilters {
  status?: string;
  priority?: string;
  category?: string;
  role?: string;
  school_id?: string | number;
  search?: string;
}

export interface CreateTicketPayload {
  subject: string;
  description: string;
  category: string;
  priority: string;
  media_file?: File | null;
}

export const MAX_WORDS_LIMIT = 200;
export const MAX_MEDIA_BYTES = 200 * 1024; // 200 KB

export function countWords(text: string): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export async function getSupportTickets(
  filters: SupportTicketFilters = {}
): Promise<SupportTicket[]> {
  const query = new URLSearchParams();
  if (filters.status && filters.status !== "ALL") query.set("status", filters.status);
  if (filters.priority && filters.priority !== "ALL") query.set("priority", filters.priority);
  if (filters.category && filters.category !== "ALL") query.set("category", filters.category);
  if (filters.role && filters.role !== "ALL") query.set("role", filters.role);
  if (filters.school_id && filters.school_id !== "ALL") query.set("school_id", String(filters.school_id));
  if (filters.search) query.set("search", filters.search);

  const qs = query.toString();
  const url = `${API_BASE_URL}/support-tickets/${qs ? `?${qs}` : ""}`;

  const res = await fetchWithAuth(url);
  if (!res.ok) {
    let msg = "Failed to load support tickets.";
    try {
      const err = await res.json();
      msg = err?.detail || err?.message || err?.error || msg;
    } catch {}
    throw new Error(msg);
  }

  const data = await res.json();
  return Array.isArray(data) ? data : data.results || [];
}

export async function getSupportTicket(id: number): Promise<SupportTicket> {
  const url = `${API_BASE_URL}/support-tickets/${id}/`;
  const res = await fetchWithAuth(url);
  if (!res.ok) {
    let msg = "Failed to load ticket details.";
    try {
      const err = await res.json();
      msg = err?.detail || err?.message || err?.error || msg;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

export async function getActiveSupportTicket(): Promise<{
  has_active_ticket: boolean;
  ticket: SupportTicket | null;
}> {
  const url = `${API_BASE_URL}/support-tickets/active/`;
  const res = await fetchWithAuth(url);
  if (!res.ok) {
    return { has_active_ticket: false, ticket: null };
  }
  return res.json();
}

export async function getSupportTicketStats(): Promise<SupportTicketStats> {
  const url = `${API_BASE_URL}/support-tickets/stats/`;
  const res = await fetchWithAuth(url);
  if (!res.ok) {
    throw new Error("Failed to load support ticket statistics.");
  }
  return res.json();
}

export async function createSupportTicket(payload: CreateTicketPayload): Promise<SupportTicket> {
  // Validate word limit
  const words = countWords(payload.description);
  if (words > MAX_WORDS_LIMIT) {
    throw new Error(`Description cannot exceed ${MAX_WORDS_LIMIT} words (${words} words entered).`);
  }

  // Validate media file size
  if (payload.media_file && payload.media_file.size > MAX_MEDIA_BYTES) {
    const sizeKb = Math.round(payload.media_file.size / 1024);
    throw new Error(`Attached file exceeds 200 KB limit (selected: ${sizeKb} KB). Please upload a smaller file.`);
  }

  const url = `${API_BASE_URL}/support-tickets/`;
  const res = await fetchWithAuth(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subject: payload.subject,
      description: payload.description,
      category: payload.category,
      priority: payload.priority,
    }),
  });

  if (!res.ok) {
    let msg = "Failed to create support ticket.";
    try {
      const err = await res.json();
      msg = err?.message || err?.error || err?.detail || msg;
    } catch {}
    throw new Error(msg);
  }

  const ticket: SupportTicket = await res.json();

  // If initial media was attached, send it as a message in the ticket
  if (payload.media_file) {
    try {
      const formData = new FormData();
      formData.append("media_file", payload.media_file);
      formData.append("text_content", "Attached file with ticket creation.");
      await sendTicketMessage(ticket.id, formData);
    } catch (attachErr) {
      console.warn("Failed to attach initial media:", attachErr);
    }
  }

  return ticket;
}

export async function acceptSupportTicket(ticketId: number): Promise<SupportTicket> {
  const url = `${API_BASE_URL}/support-tickets/${ticketId}/accept/`;
  const res = await fetchWithAuth(url, { method: "POST" });
  if (!res.ok) {
    let msg = "Failed to accept ticket.";
    try {
      const err = await res.json();
      msg = err?.detail || err?.message || err?.error || msg;
    } catch {}
    throw new Error(msg);
  }
  const data = await res.json();
  return data.ticket;
}

export async function closeSupportTicket(
  ticketId: number,
  closingNotes?: string
): Promise<SupportTicket> {
  const url = `${API_BASE_URL}/support-tickets/${ticketId}/close/`;
  const res = await fetchWithAuth(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ closing_notes: closingNotes || "" }),
  });
  if (!res.ok) {
    let msg = "Failed to close ticket.";
    try {
      const err = await res.json();
      msg = err?.detail || err?.message || err?.error || msg;
    } catch {}
    throw new Error(msg);
  }
  const data = await res.json();
  return data.ticket;
}

export async function getTicketMessages(ticketId: number): Promise<{
  ticket_id: number;
  ticket_number: string;
  ticket_status: string;
  subject: string;
  messages: TicketMessage[];
}> {
  const url = `${API_BASE_URL}/support-tickets/${ticketId}/messages/`;
  const res = await fetchWithAuth(url);
  if (!res.ok) {
    throw new Error("Failed to load ticket messages.");
  }
  return res.json();
}

export async function sendTicketMessage(
  ticketId: number,
  formData: FormData
): Promise<TicketMessage> {
  const url = `${API_BASE_URL}/support-tickets/${ticketId}/messages/`;
  const res = await fetchWithAuth(url, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    let msg = "Failed to send message.";
    try {
      const err = await res.json();
      msg = err?.error || err?.detail || err?.message || msg;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}
