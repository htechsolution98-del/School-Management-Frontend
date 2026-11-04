"use client";

import React from "react";
import { NotificationsHub } from "@/components/notifications/notifications-hub";

export default function SuperAdminNotificationsPage() {
  return (
    <NotificationsHub
      roleTitle="Super Admin"
      pageTitle="Platform Alerts & System Notifications"
      pageSubtitle="Platform-wide notifications, tenant alerts, system activity, and administrative broadcasts."
    />
  );
}

