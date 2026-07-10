"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { getWebSocketUrl } from "@/lib/config";
import { getAnnouncements, type AnnouncementResponse } from "@/lib/principal";

const LOCAL_STORAGE_KEY = "announcement_notifications";
const READ_IDS_KEY = "read_announcement_ids";

function isTargetAudienceForUser(announcement: AnnouncementResponse, userRoles: string[]) {
  // Check if announcement has expired
  if (announcement.expires_at) {
    const expiry = new Date(announcement.expires_at);
    if (expiry.getTime() < Date.now()) {
      return false;
    }
  }

  const normUserRoles = userRoles.map((r) => r.toUpperCase());
  const normTarget = (announcement.announcement_for || "").toUpperCase();
  const isEveryone = String(announcement.is_everyone) === "true";

  // Staff roles include: teacher, clerk, librarian, trustee, principal, superadmin
  const isStaffUser =
    normUserRoles.includes("TEACHER") ||
    normUserRoles.includes("CLERK") ||
    normUserRoles.includes("LIBRARIAN") ||
    normUserRoles.includes("TRUSTEE") ||
    normUserRoles.includes("PRINCIPAL") ||
    normUserRoles.includes("SUPER_ADMIN");

  return (
    isEveryone ||
    normTarget === "ALL" ||
    (normTarget === "TEACHER" && isStaffUser) ||
    normUserRoles.includes(normTarget) ||
    normUserRoles.includes("SUPER_ADMIN") ||
    normUserRoles.includes("PRINCIPAL")
  );
}

export function useAnnouncementSocket() {
  const [notifications, setNotifications] = useState<AnnouncementResponse[]>([]);
  const [readIds, setReadIds] = useState<(number | string)[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to load read IDs from localStorage
  const getReadIds = useCallback((): (number | string)[] => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(READ_IDS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, []);

  // Initialize notifications from localStorage & fetch active announcements from API
  useEffect(() => {
    let userRoles: string[] = [];
    if (typeof window !== "undefined") {
      try {
        const rolesJson = localStorage.getItem("roles");
        if (rolesJson) {
          userRoles = JSON.parse(rolesJson) as string[];
        }
      } catch { /* ignore */ }

      // 1. Instantly load from localStorage for fast initial paint
      try {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as AnnouncementResponse[];
          setNotifications(parsed);
          const rIds = getReadIds();
          setReadIds(rIds);
          const unread = parsed.filter((n) => !rIds.includes(n.id)).length;
          setUnreadCount(unread);
        }
      } catch (err) {
        console.warn("Failed to load notifications from localStorage", err);
      }
    }

    // 2. Fetch fresh announcements from HTTP API
    const fetchFreshAnnouncements = async () => {
      try {
        const freshList = await getAnnouncements();
        // Filter by user role target audience
        const filtered = freshList.filter((ann) => isTargetAudienceForUser(ann, userRoles));
        // Sort: newest first
        const sorted = filtered.sort((a, b) => {
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        });

        setNotifications(sorted);
        if (typeof window !== "undefined") {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sorted));
          const rIds = getReadIds();
          setReadIds(rIds);
          const unread = sorted.filter((n) => !rIds.includes(n.id)).length;
          setUnreadCount(unread);
          localStorage.setItem(`${LOCAL_STORAGE_KEY}_unread_count`, String(unread));
        }
      } catch (err) {
        console.warn("Failed to fetch fresh announcements from API:", err);
      }
    };

    fetchFreshAnnouncements();
  }, [getReadIds]);

  const saveNotifications = useCallback((newNotifications: AnnouncementResponse[], newUnread: number) => {
    setNotifications(newNotifications);
    setUnreadCount(newUnread);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newNotifications));
        localStorage.setItem(`${LOCAL_STORAGE_KEY}_unread_count`, String(newUnread));
      } catch (err) {
        console.error("Failed to save notifications to localStorage", err);
      }
    }
  }, []);

  const clearNotifications = useCallback(() => {
    saveNotifications([], 0);
    setReadIds([]);
    if (typeof window !== "undefined") {
      localStorage.removeItem(READ_IDS_KEY);
    }
  }, [saveNotifications]);

  const markAsRead = useCallback((id: number | string) => {
    if (typeof window !== "undefined") {
      try {
        const rIds = getReadIds();
        if (!rIds.includes(id)) {
          const updatedReadIds = [...rIds, id];
          localStorage.setItem(READ_IDS_KEY, JSON.stringify(updatedReadIds));
          setReadIds(updatedReadIds);
          
          setNotifications((prev) => {
            const unread = prev.filter((n) => !updatedReadIds.includes(n.id)).length;
            setUnreadCount(unread);
            localStorage.setItem(`${LOCAL_STORAGE_KEY}_unread_count`, String(unread));
            return prev;
          });
        }
      } catch (err) {
        console.error("Failed to mark announcement as read:", err);
      }
    }
  }, [getReadIds]);

  const markAllAsRead = useCallback(() => {
    if (typeof window !== "undefined") {
      try {
        const ids = notifications.map((n) => n.id);
        localStorage.setItem(READ_IDS_KEY, JSON.stringify(ids));
        setReadIds(ids);
        saveNotifications(notifications, 0);
      } catch (err) {
        console.error("Failed to mark all as read:", err);
      }
    }
  }, [notifications, saveNotifications]);

  const connect = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) return;

    const wsUrl = getWebSocketUrl("/ws/announcement/");
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log("WebSocket connection established:", wsUrl);
      setIsConnected(true);
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("WebSocket message received:", data);

        // Standardize keys (handling nested payloads or direct fields)
        const announcement: AnnouncementResponse = {
          id: data.id ?? Date.now(),
          title: data.title ?? "School Announcement",
          description: data.description ?? "",
          announcement_for: data.announcement_for ?? "ALL",
          is_everyone: data.is_everyone ?? "true",
          created_at: data.created_at ?? new Date().toISOString(),
          created_by: data.created_by,
        };

        // Determine if target audience matches current user's roles
        let userRoles: string[] = [];
        if (typeof window !== "undefined") {
          try {
            const rolesJson = localStorage.getItem("roles");
            if (rolesJson) {
              userRoles = JSON.parse(rolesJson) as string[];
            }
          } catch { /* ignore */ }
        }

        if (isTargetAudienceForUser(announcement, userRoles)) {
          // Play a gentle notification sound (optional/standard visual toast)
          toast.info(`📢 ${announcement.title}`, {
            description: announcement.description,
            duration: 8000,
          });

          // Prepend to notification list (limit to recent 50)
          setNotifications((prev) => {
            const updated = [announcement, ...prev].slice(0, 50);
            const readIds = getReadIds();
            const unread = updated.filter((n) => !readIds.includes(n.id)).length;
            setUnreadCount(unread);
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
            localStorage.setItem(`${LOCAL_STORAGE_KEY}_unread_count`, String(unread));
            return updated;
          });
        }
      } catch (err) {
        console.error("Error parsing WebSocket message content:", err);
      }
    };

    socket.onclose = (event) => {
      console.log(`WebSocket closed (code: ${event.code}). Reconnecting...`);
      setIsConnected(false);
      
      // Auto-reconnect after 5 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 5000);
    };

    socket.onerror = (error) => {
      console.warn("WebSocket encountered error:", error);
      socket.close();
    };
  }, [getReadIds, saveNotifications, notifications]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [connect]);

  return {
    notifications,
    readIds,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  };
}
