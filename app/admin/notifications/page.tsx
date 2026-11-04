"use client";

import React from "react";
import { NotificationsHub } from "@/components/notifications/notifications-hub";

export default function AdminNotificationsPage() {
  return (
    <NotificationsHub
      roleTitle="Admin"
      pageTitle="Administrator Alerts & System Notifications"
      pageSubtitle="Institutional updates, user registrations, academic notifications, and school alerts."
    />
  );
}

