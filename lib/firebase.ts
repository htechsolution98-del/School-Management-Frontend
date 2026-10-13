"use client";

import { initializeApp, getApps, getApp } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported, type Messaging } from "firebase/messaging";
import { API_BASE_URL } from "./config";
import { fetchWithAuth } from "./auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDt9KV7CoiuWFZ3QAtj4F6fHLBjj_KjFo4",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "l-school-management-system.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "l-school-management-system",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "l-school-management-system.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "549201101776",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:549201101776:web:10042282b6d02331e9afd5",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-ZWHWTLLG0S",
};

export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

let messagingInstance: Messaging | null = null;

export async function getClientMessaging(): Promise<Messaging | null> {
  if (typeof window === "undefined") return null;
  const supported = await isSupported().catch(() => false);
  if (!supported) return null;
  if (!messagingInstance) {
    messagingInstance = getMessaging(app);
  }
  return messagingInstance;
}

export async function registerFcmTokenWithBackend(token: string): Promise<boolean> {
  if (!token) return false;
  try {
    const res = await fetchWithAuth(`${API_BASE_URL}/fcm/register-token/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: token.trim(),
        device_type: "web",
      }),
    });
    return res.ok;
  } catch (err) {
    console.warn("[FCM Client] Token registration to backend failed:", err);
    return false;
  }
}

export async function enablePushNotifications(
  vapidKey?: string,
  requestUserPermission: boolean = false
): Promise<{ success: boolean; token?: string; error?: string }> {
  if (typeof window === "undefined") {
    return { success: false, error: "Window is undefined" };
  }

  if (!("Notification" in window)) {
    return { success: false, error: "Browser does not support notifications" };
  }

  try {
    // By default, NEVER prompt parents or trigger browser permission modals.
    if (Notification.permission !== "granted") {
      if (!requestUserPermission) {
        return { success: false, error: "Notification permission not granted (silent mode)" };
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        return { success: false, error: "Notification permission denied by user" };
      }
    }

    const messaging = await getClientMessaging();
    if (!messaging) {
      return { success: false, error: "Firebase messaging is not supported in this environment" };
    }

    // Register service worker
    let swRegistration: ServiceWorkerRegistration | undefined;
    if ("serviceWorker" in navigator) {
      swRegistration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
        scope: "/",
      });
      await navigator.serviceWorker.ready;
    }

    const tokenOptions: { serviceWorkerRegistration?: ServiceWorkerRegistration; vapidKey?: string } = {};
    if (swRegistration) {
      tokenOptions.serviceWorkerRegistration = swRegistration;
    }
    const finalVapidKey = vapidKey || process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    if (finalVapidKey) {
      tokenOptions.vapidKey = finalVapidKey;
    }

    const token = await getToken(messaging, tokenOptions);
    if (!token) {
      return { success: false, error: "Could not retrieve FCM registration token" };
    }

    // Store in localStorage for fast re-check
    localStorage.setItem("fcm_device_token", token);

    // Send to backend
    await registerFcmTokenWithBackend(token);

    return { success: true, token };
  } catch (err: any) {
    console.warn("[FCM Client] Error enabling push notifications:", err);
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Silently register device push token with backend ONLY if permission is already granted.
 * NEVER prompts parents or asks for browser permission.
 */
export async function registerPushSilently(
  vapidKey?: string
): Promise<{ success: boolean; token?: string; error?: string }> {
  return enablePushNotifications(vapidKey, false);
}

export function listenToForegroundMessages(
  onNotification: (payload: { title: string; body: string; data?: any }) => void
): () => void {
  let unsubscribe: (() => void) | null = null;

  getClientMessaging().then((messaging) => {
    if (!messaging) return;
    unsubscribe = onMessage(messaging, (payload) => {
      console.log("[FCM Client] Foreground message received:", payload);
      const title = payload.notification?.title || payload.data?.title || "Absent Alert";
      const body = payload.notification?.body || payload.data?.message || payload.data?.body || "Student marked absent";
      
      onNotification({
        title,
        body,
        data: payload.data,
      });

      // If user has granted browser notifications, show desktop alert even when tab is open
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        try {
          new Notification(title, {
            body,
            icon: "/logo.png",
          });
        } catch { /* ignore */ }
      }
    });
  });

  return () => {
    if (unsubscribe) unsubscribe();
  };
}
