"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { getWebSocketUrl } from "@/lib/config";
import { getAnnouncements, type AnnouncementResponse } from "@/lib/principal";
import { forceLogout, getAccessToken } from "@/lib/auth";

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

  const normUserRoles = userRoles.map((r) => (r || "").toUpperCase().trim());
  const normTarget = (announcement.announcement_for || "").toUpperCase().trim();
  const isEveryone = String(announcement.is_everyone) === "true" || announcement.is_everyone === true;

  // Management always sees all announcements
  if (
    normUserRoles.includes("SUPER_ADMIN") ||
    normUserRoles.includes("SUPERADMIN") ||
    normUserRoles.includes("PRINCIPAL") ||
    normUserRoles.includes("VICE PRINCIPAL") ||
    normUserRoles.includes("TRUSTEE") ||
    normUserRoles.includes("ADMIN(TRUSTEE)")
  ) {
    return true;
  }

  // If announcement is for everyone or target is ALL or blank -> visible to everyone
  if (isEveryone || normTarget === "ALL" || !normTarget) {
    return true;
  }

  // Staff category check
  const isStaffUser =
    normUserRoles.includes("TEACHER") ||
    normUserRoles.includes("CLERK") ||
    normUserRoles.includes("ASSISTANT CLERK") ||
    normUserRoles.includes("ASSISTANT_CLERK") ||
    normUserRoles.includes("LIBRARIAN") ||
    normUserRoles.includes("FEES") ||
    normUserRoles.includes("FEES MANAGEMENT") ||
    normUserRoles.includes("INVENTORY");

  if (normTarget === "TEACHER" && (normUserRoles.includes("TEACHER") || isStaffUser)) {
    return true;
  }

  if (normTarget === "CLERK" && (normUserRoles.includes("CLERK") || normUserRoles.includes("ASSISTANT CLERK") || normUserRoles.includes("ASSISTANT_CLERK"))) {
    return true;
  }

  if (normTarget === "FEE-MANAGER" && (normUserRoles.includes("FEES") || normUserRoles.includes("FEES MANAGEMENT") || normUserRoles.includes("CLERK"))) {
    return true;
  }

  if (normTarget === "PARENT" && (normUserRoles.includes("PARENT") || normUserRoles.includes("PARENTS"))) {
    return true;
  }

  if (normTarget === "STUDENT" && normUserRoles.includes("STUDENT")) {
    return true;
  }

  if (normTarget === "TRANSPORT" && (normUserRoles.includes("TRANSPORT") || normUserRoles.includes("TRANSPORTATION") || normUserRoles.includes("DRIVER"))) {
    return true;
  }

  return normUserRoles.includes(normTarget);
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

    const token = getAccessToken();
    if (!token) {
      // Do not attempt to connect or spam the server when user is not logged in
      setIsConnected(false);
      return;
    }

    const wsUrl = getWebSocketUrl(`/ws/announcement/?token=${encodeURIComponent(token)}`);
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

        // School deactivated → force logout immediately
        if (data?.type === "logout" || data?.reason === "school_deactivated") {
          toast.error("Session ended", {
            description:
              data?.message ||
              "Your school has been deactivated. Contact administrator.",
          });
          setTimeout(() => forceLogout(), 1500);
          return;
        }

        // Feature status changed in real-time
        if (data?.type === "feature_status_changed") {
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("feature_status_changed", { detail: data }));
          }
          toast.info("Feature Access Updated", {
            description: `${data.feature_name || "Module"} is now ${data.is_enabled ? "activated" : "deactivated"} for your school.`,
            duration: 4000,
          });
          return;
        }

        // Staff status changed in real-time
        if (data?.type === "staff_status_changed") {
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("staff_status_changed", { detail: data }));
          }
          return;
        }

        // Standardize keys (handling nested payloads or direct fields)
        const announcement: AnnouncementResponse = {
          id: data.id ?? Date.now(),
          title: data.title ?? "School Announcement",
          description: data.description ?? "",
          announcement_for: data.announcement_for ?? "ALL",
          is_everyone: data.is_everyone ?? true,
          priority: data.priority ?? "NORMAL",
          created_at: data.created_at ?? new Date().toISOString(),
          expires_at: data.expires_at,
          created_by: data.created_by,
          created_by_name: data.created_by_name,
          created_by_role: data.created_by_role,
          can_manage: data.can_manage ?? false,
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
          // Dispatch custom event for real-time reactive UI updates
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("announcement_received", { detail: announcement }));
          }

          const priorityBadge = announcement.priority === "URGENT" ? "🚨 " : announcement.priority === "IMPORTANT" ? "⚠️ " : "📢 ";
          // Play notification toast
          toast.info(`${priorityBadge}${announcement.title}`, {
            description: announcement.description?.length > 90 ? `${announcement.description.slice(0, 90)}...` : announcement.description,
            duration: 8000,
          });

          // Prepend to notification list (limit to recent 50)
          setNotifications((prev) => {
            const exists = prev.some((p) => p.id === announcement.id);
            const updated = exists
              ? prev.map((p) => (p.id === announcement.id ? announcement : p))
              : [announcement, ...prev].slice(0, 50);
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
      console.log(`WebSocket closed (code: ${event.code}).`);
      setIsConnected(false);

      // Auto-reconnect after 5 seconds only if user is logged in
      if (getAccessToken()) {
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 5000);
      }
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
